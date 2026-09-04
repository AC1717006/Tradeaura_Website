# TradeAura — Remediation & Deployment Runbook

**Status: PREPARED, NOT EXECUTED.** Every command below requires your explicit approval.
Placeholders to fill: `<AWS_ACCOUNT_ID>`, `<PROD_DISTRIBUTION_ID>`, `<STAGING_DISTRIBUTION_ID>`.

---

## P0 — Security incident (do first, independent of the redesign)

### Order matters
Rotate **before** deleting. Deleting `/.env` without rotating leaves already-harvested
credentials valid and removes your evidence. Assume everything in that file is compromised:
it has been publicly served for an unknown period.

### P0.1 — Rotate credentials `[REQUIRES APPROVAL — manual, provider consoles]`

Not scriptable, and I will not do it. In each provider's console, revoke then reissue:

| Provider | What | Notes |
|---|---|---|
| **Upstox** | API key, API secret, access token | **Highest priority — broker credentials.** Check the account for unauthorised activity. |
| Groq | API key | |
| NewsData.io | API key | |
| Currents API | API key | |
| Instagram Graph | Long-lived access token | |
| Google Gemini | API key | Referenced but unused |

Then update the matching **GitHub → Settings → Secrets → Actions** entries.
Firebase `apiKey` does **not** need rotation — it is public by design.

### P0.2 — Remove the exposed objects `[REQUIRES APPROVAL — PRODUCTION CHANGE]`

```bash
# Confirm before deleting — expect: 1286
aws s3api head-object --bucket auraautomation.site --key .env --query ContentLength
```
```bash
aws s3api delete-object --bucket auraautomation.site --key .env
```
```bash
aws s3api delete-object --bucket auraautomation.site --key .env.example
```

**Risk:** none to the website — no page references `.env`.
**Caveat:** if versioning is already on, `delete-object` writes a delete marker and prior
versions remain retrievable by anyone with `s3:GetObjectVersion`. Purge them explicitly:

```bash
aws s3api list-object-versions --bucket auraautomation.site --prefix .env \
  --query 'Versions[].{K:Key,V:VersionId}' --output text
```
```bash
# then, per VersionId returned above
aws s3api delete-object --bucket auraautomation.site --key .env --version-id <VERSION_ID>
```

### P0.3 — Invalidate CloudFront `[REQUIRES APPROVAL — PRODUCTION CHANGE]`

```bash
aws cloudfront create-invalidation --distribution-id <PROD_DISTRIBUTION_ID> \
  --paths '/.env' '/.env.example'
```

**Necessary but not sufficient.** The bucket is directly readable
(`https://s3.amazonaws.com/auraautomation.site/.env` → 200), so CloudFront is bypassable.
P0.2 is the fix; this only clears the edge cache.

### P0.4 — Verify `[READ-ONLY]`

```bash
for p in .env .env.example; do
  echo -n "cloudfront /$p: "; curl -s -o /dev/null -w '%{http_code}\n' "https://www.auraautomation.site/$p"
  echo -n "direct s3  /$p: "; curl -s -o /dev/null -w '%{http_code}\n' "https://s3.amazonaws.com/auraautomation.site/$p"
done
```
Both must return **403** or **404**.

### P0.5 — Prevent recurrence `[LOCAL CHANGE → then approval to install]`

Install `deploy/workflows/deploy.yml` + `deploy/scripts/verify-dist.sh`.
The gate refuses to publish `.env`, keys, source files, or a shrunken site,
and the IAM policy adds a belt-and-braces `Deny s3:PutObject` on `.env*`.

---

## P1 — Structural hardening

### P1.1 — Enable versioning `[REQUIRES APPROVAL]`

```bash
aws s3api put-bucket-versioning --bucket auraautomation.site \
  --versioning-configuration Status=Enabled
```
**Do this before any sync.** `deploy.yml` refuses to run without it.
**Risk:** storage cost grows; add a lifecycle rule to expire noncurrent versions after 90 days.

### P1.2 — Backup bucket + snapshot `[REQUIRES APPROVAL]`

```bash
aws s3 mb s3://auraautomation-backup --region us-east-1
```
```bash
aws s3api put-public-access-block --bucket auraautomation-backup \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```
```bash
aws s3 sync s3://auraautomation.site s3://auraautomation-backup/pre-cutover-$(date -u +%Y%m%d-%H%M%S)
```
This snapshot is your rollback if versioning turns out to be off.

### P1.3 — OAC + Block Public Access `[REQUIRES APPROVAL — highest-risk step]`

**Order is critical. Reversed, the site goes down.**

1. Create the OAC (Console → CloudFront → Origin access → Create control setting; sign
   requests, S3 origin type).
2. Attach it to the distribution's S3 origin. If the origin is currently the **S3 website
   endpoint**, it must change to the **REST endpoint** (`auraautomation.site.s3.us-east-1.amazonaws.com`).
   ⚠️ The REST endpoint does **not** do directory-index resolution — `/pages/` will 403
   where the website endpoint served `/pages/index.html`. Our URLs are all explicit `.html`,
   so this is safe here, but verify before switching.
3. Apply the bucket policy: `deploy/aws/s3-bucket-policy-oac.json` (fill both placeholders).
   ```bash
   aws s3api put-bucket-policy --bucket auraautomation.site \
     --policy file://deploy/aws/s3-bucket-policy-oac.json
   ```
4. **Verify the site still loads through CloudFront**, then:
   ```bash
   aws s3api put-public-access-block --bucket auraautomation.site \
     --public-access-block-configuration \
     BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```
5. Confirm direct access is dead:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://s3.amazonaws.com/auraautomation.site/index.html
   ```
   Must be **403**.

**Rollback:** remove the public-access-block, restore the previous bucket policy, revert the
origin. Keep the old policy JSON before overwriting:
```bash
aws s3api get-bucket-policy --bucket auraautomation.site --query Policy --output text > /tmp/bucket-policy-BEFORE.json
```

### P1.4 — Purge git history `[REQUIRES APPROVAL — destructive to history]`

```bash
pip install --user git-filter-repo
```
```bash
git clone --mirror https://github.com/AC1717006/Tradeaura_Website.git tradeaura-mirror
cd tradeaura-mirror && git filter-repo --path .env --invert-paths --force
git push --force --all && git push --force --tags
```
**Risks:** rewrites every commit SHA; open PRs break; all collaborators must re-clone.
**Rotate first (P0.1)** — history purging alone does not invalidate a leaked key, and forks
or clones may retain it.

### P1.5 — OIDC instead of static keys `[REQUIRES APPROVAL]`

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```
```bash
aws iam create-role --role-name TradeAuraDeployRole \
  --assume-role-policy-document file://deploy/aws/oidc-trust-policy.json
```
```bash
aws iam put-role-policy --role-name TradeAuraDeployRole \
  --policy-name TradeAuraDeploy --policy-document file://deploy/aws/iam-deploy-policy.json
```
```bash
aws iam create-role --role-name TradeAuraContentRole \
  --assume-role-policy-document file://deploy/aws/oidc-trust-policy.json
aws iam put-role-policy --role-name TradeAuraContentRole \
  --policy-name TradeAuraContent --policy-document file://deploy/aws/iam-content-policy.json
```
Then add `AWS_DEPLOY_ROLE_ARN` / `AWS_CONTENT_ROLE_ARN` as GitHub secrets and
**delete `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`** — and deactivate that IAM user's
access key in IAM. Those keys have been used by a workflow whose output was public; treat
them as suspect and rotate regardless.

---

## P2 — Pipeline

| Step | Action |
|---|---|
| P2.1 | Create `staging.auraautomation.site` — see **Staging setup** below |
| P2.2 | GitHub → Settings → Environments → `production` → **Required reviewers: you**. This is what turns the approval gate on; the workflow alone does not enforce it. |
| P2.3 | Install `deploy/workflows/deploy.yml` |
| P2.4 | Install `deploy/workflows/content-refresh.yml`; delete the `workflow_run` trigger and the deploy coupling from the three content workflows |
| P2.5 | Delete `Tradeaura_Website/` (dormant workflow, `--delete`, no excludes) |
| P2.6 | Take `/admin/index.html` offline — hard-coded password, prompts for a GitHub PAT |

---

## Staging setup `[REQUIRES APPROVAL]`

```bash
aws s3 mb s3://staging.auraautomation.site --region us-east-1
```
```bash
aws s3api put-bucket-versioning --bucket staging.auraautomation.site \
  --versioning-configuration Status=Enabled
```
```bash
aws s3api put-public-access-block --bucket staging.auraautomation.site \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```
Then, in the Console: a CloudFront distribution with an **OAC** origin to this bucket,
default root object `index.html`, HTTPS-only. Optionally restrict it with a
CloudFront Function checking a shared header, or Basic Auth, so staging is not indexable.
Add `staging.auraautomation.site` to Hostinger DNS as a CNAME to the new distribution.

**Do NOT use `tradeaura-website-2026`.** Evidence says legacy/old production:
ap-south-1, last modified 17 May 2026, 27 KB index vs 414 KB, no `/news/`, canonical
pointing at production. Repurposing destroys a historical artifact and leaves a public
stale site during QA.

---

## Production cutover `[REQUIRES APPROVAL]`

1. P0 complete and verified.
2. Versioning on; snapshot taken (P1.2).
3. Staging deployed; `smoke-test.sh` green against staging.
4. Manual QA on staging: 9 page types, mobile, ticker, contact form.
5. Approve the `production` environment gate.
6. Workflow: snapshot → sync `./dist` → invalidate → smoke test → assert-secrets-not-public.
7. Post-deploy: re-run `smoke-test.sh` against production; submit the new sitemap in
   Google Search Console (208 → 622 URLs).

---

## Rollback

| Scenario | Action |
|---|---|
| Bad deploy, versioning ON | Restore prior versions, or `aws s3 sync s3://auraautomation-backup/<STAMP> s3://auraautomation.site --delete`, then invalidate `/*` |
| Bad deploy, versioning OFF | Restore from the P1.2 snapshot — this is why P1.2 precedes cutover |
| Site down after OAC change | Remove public-access-block, restore `/tmp/bucket-policy-BEFORE.json`, revert the origin to the previous endpoint |
| Content job broke news | Content jobs never `--delete`; re-run, or restore `news/` from the snapshot |
| Need the old site entirely | `git revert` to `a05a296d` and deploy that commit through the same pipeline |
| Stale content after rollback | Always `create-invalidation --paths '/*'` — otherwise edges serve the bad version up to ~24 h |

**Do not use DNS as a rollback lever.** `www` is a CloudFront CNAME; an S3 restore is faster
than any TTL change.

---

## Pre-deployment checklist

**Security**
- [ ] Upstox credentials rotated
- [ ] Groq / NewsData / Currents / Instagram / Gemini rotated
- [ ] GitHub Secrets updated
- [ ] `/.env` deleted from S3 (+ all versions)
- [ ] CloudFront invalidated for `/.env`
- [ ] Both CloudFront and direct-S3 return 403/404 for `/.env`
- [ ] `.env` purged from git history
- [ ] Static IAM keys deactivated, OIDC roles in place

**AWS**
- [ ] Production versioning **Enabled**
- [ ] Backup bucket created, snapshot taken
- [ ] Staging bucket created, private, versioned
- [ ] OAC attached; Block Public Access on
- [ ] Direct S3 access returns 403
- [ ] Distribution IDs recorded

**Pipeline**
- [ ] `production` environment has required reviewers
- [ ] `verify-dist.sh` passes locally *(verified 2026-08-22: PASS)*
- [ ] Negative test confirms the gate fails on planted secrets *(verified: FAIL, exit 1)*
- [ ] Content workflows decoupled from production deploys
- [ ] `Tradeaura_Website/` removed

**Content**
- [ ] 609 articles present *(verified)*
- [ ] 0 news URLs missing, 0 canonicals changed *(verified)*
- [ ] 3 project placeholders resolved or removed
- [ ] 2 `[YOUR PRICE]` values filled
- [ ] Legal copy written
- [ ] Real logo supplied
- [ ] `helloajaychouhan@gmail.com` confirmed as the public address
