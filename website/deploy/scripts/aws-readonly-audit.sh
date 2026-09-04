#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# aws-readonly-audit.sh
#
# RUN THIS IN AWS CLOUDSHELL (or your local machine) — NOT on the
# EC2 trading server.
#
# Every command is READ-ONLY: get-*, list-*, describe-*, head-*.
# Nothing is created, modified, deleted or invalidated.
#
#   curl -o audit.sh <this file>   # or paste it
#   bash audit.sh 2>&1 | tee tradeaura-aws-audit.txt
#
# Then send me tradeaura-aws-audit.txt.
#
# BEFORE SENDING: redact any AKIA… access key IDs. Secret keys are
# never returned by these APIs, so none can leak here.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

BUCKET_PROD="auraautomation.site"
BUCKET_OLD="tradeaura-website-2026"
SITE_ALIAS="www.auraautomation.site"
export AWS_PAGER=""

hr()  { printf '\n══════════════════════════════════════════════════════════\n%s\n══════════════════════════════════════════════════════════\n' "$1"; }
sub() { printf '\n── %s\n' "$1"; }
run() { echo "\$ $*"; "$@" 2>&1 | sed 's/^/   /'; echo; }

hr "0. IDENTITY & CONTEXT"
run aws sts get-caller-identity
sub "CLI version"
aws --version 2>&1 | sed 's/^/   /'

# ═══ 1. VERSIONING ═══════════════════════════════════════════
hr "1. PRODUCTION BUCKET VERSIONING"
sub "Empty output / no 'Status' field  ⇒  versioning has NEVER been enabled"
run aws s3api get-bucket-versioning --bucket "$BUCKET_PROD"

# ═══ 2. PUBLIC ACCESS BLOCK ══════════════════════════════════
hr "2. PRODUCTION PUBLIC ACCESS BLOCK"
sub "'NoSuchPublicAccessBlockConfiguration' ⇒ no block configured (all four settings effectively false)"
run aws s3api get-public-access-block --bucket "$BUCKET_PROD"

sub "Account-level block (overrides per-bucket)"
ACCT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
run aws s3control get-public-access-block --account-id "$ACCT"

# ═══ 3. BUCKET POLICY / ACL / STATUS ═════════════════════════
hr "3. PRODUCTION BUCKET POLICY"
sub "Policy document"
echo "\$ aws s3api get-bucket-policy --bucket $BUCKET_PROD --query Policy --output text"
aws s3api get-bucket-policy --bucket "$BUCKET_PROD" --query Policy --output text 2>&1 | sed 's/^/   /'
echo

sub "Is the bucket considered public?"
run aws s3api get-bucket-policy-status --bucket "$BUCKET_PROD"

sub "ACL (look for AllUsers / AuthenticatedUsers grants)"
run aws s3api get-bucket-acl --bucket "$BUCKET_PROD"

sub "Ownership controls"
run aws s3api get-bucket-ownership-controls --bucket "$BUCKET_PROD"

sub "Encryption"
run aws s3api get-bucket-encryption --bucket "$BUCKET_PROD"

sub "Lifecycle rules (relevant once versioning is on)"
run aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_PROD"

sub "Region"
run aws s3api get-bucket-location --bucket "$BUCKET_PROD"

# ═══ 4+5. WEBSITE vs REST ENDPOINT ═══════════════════════════
hr "4/5. STATIC WEBSITE HOSTING (decides website vs REST endpoint)"
sub "If this returns a config, the bucket has website hosting ON."
sub "'NoSuchWebsiteConfiguration' ⇒ website hosting is OFF (REST only)."
run aws s3api get-bucket-website --bucket "$BUCKET_PROD"

# ═══ 4. CLOUDFRONT ═══════════════════════════════════════════
hr "4. CLOUDFRONT — DISCOVER THE DISTRIBUTION"
sub "All distributions with their aliases"
run aws cloudfront list-distributions \
  --query "DistributionList.Items[].{Id:Id,Domain:DomainName,Aliases:join(',',Aliases.Items||['-']),Status:Status,Enabled:Enabled}" \
  --output table

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items||\`[]\`, '$SITE_ALIAS')].Id | [0]" \
  --output text 2>/dev/null)

if [ -n "${DIST_ID:-}" ] && [ "$DIST_ID" != "None" ]; then
  echo "   → Distribution serving $SITE_ALIAS : $DIST_ID"
  echo

  sub "ORIGINS — the DomainName here tells us website vs REST endpoint"
  run aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query "DistributionConfig.Origins.Items[].{Id:Id,DomainName:DomainName,OriginPath:OriginPath,OAC:OriginAccessControlId,OAI:S3OriginConfig.OriginAccessIdentity,CustomOrigin:CustomOriginConfig.OriginProtocolPolicy}" \
    --output table

  sub "DEFAULT CACHE BEHAVIOR"
  run aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query "DistributionConfig.{Root:DefaultRootObject,Comment:Comment,PriceClass:PriceClass,HttpVersion:HttpVersion,Behavior:DefaultCacheBehavior.{Target:TargetOriginId,Viewer:ViewerProtocolPolicy,Compress:Compress,CachePolicyId:CachePolicyId,AllowedMethods:AllowedMethods.Items}}"

  sub "ADDITIONAL CACHE BEHAVIORS"
  run aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query "DistributionConfig.CacheBehaviors.Items[].{Path:PathPattern,Target:TargetOriginId,CachePolicyId:CachePolicyId}" \
    --output table

  sub "CUSTOM ERROR RESPONSES (affects 404 handling on cutover)"
  run aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query "DistributionConfig.CustomErrorResponses.Items[].{Code:ErrorCode,Response:ResponseCode,Page:ResponsePagePath,TTL:ErrorCachingMinTTL}" \
    --output table

  sub "VIEWER CERTIFICATE"
  run aws cloudfront get-distribution-config --id "$DIST_ID" \
    --query "DistributionConfig.ViewerCertificate"
else
  echo "   ⚠ Could not auto-detect the distribution for $SITE_ALIAS."
  echo "     Take the Id from the table above and re-run with:"
  echo "       aws cloudfront get-distribution-config --id <ID>"
  echo
fi

# ═══ 6. ORIGIN ACCESS CONTROL / IDENTITY ═════════════════════
hr "6. ORIGIN ACCESS CONTROLS"
sub "OAC (modern)"
run aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[].{Id:Id,Name:Name,Origin:OriginAccessControlOriginType,Signing:SigningBehavior}" \
  --output table

sub "OAI (legacy)"
run aws cloudfront list-cloud-front-origin-access-identities \
  --query "CloudFrontOriginAccessIdentityList.Items[].{Id:Id,Comment:Comment}" \
  --output table

# ═══ 7. IAM / DEPLOYMENT IDENTITY ════════════════════════════
hr "7. DEPLOYMENT CREDENTIALS & ROLES"
sub "GitHub OIDC provider — empty means OIDC is NOT set up"
run aws iam list-open-id-connect-providers

sub "Roles that look deployment-related"
run aws iam list-roles \
  --query "Roles[?contains(RoleName,'TradeAura')||contains(RoleName,'GitHub')||contains(RoleName,'Deploy')||contains(RoleName,'Actions')||contains(RoleName,'S3')].{Name:RoleName,Arn:Arn,Created:CreateDate}" \
  --output table

sub "IAM users (the GitHub deploy key belongs to one of these)"
run aws iam list-users --query "Users[].{User:UserName,Created:CreateDate,PwdLastUsed:PasswordLastUsed}" --output table

sub "Access keys + attached policies per user"
for U in $(aws iam list-users --query "Users[].UserName" --output text 2>/dev/null); do
  echo "   ── user: $U"
  aws iam list-access-keys --user-name "$U" \
    --query "AccessKeyMetadata[].{Key:AccessKeyId,Status:Status,Created:CreateDate}" --output table 2>&1 | sed 's/^/      /'
  aws iam list-attached-user-policies --user-name "$U" \
    --query "AttachedPolicies[].PolicyName" --output text 2>&1 | sed 's/^/      attached: /'
  aws iam list-user-policies --user-name "$U" \
    --query "PolicyNames" --output text 2>&1 | sed 's/^/      inline:   /'
  echo
done

sub "Last time each access key was used (identifies the live deploy key)"
for U in $(aws iam list-users --query "Users[].UserName" --output text 2>/dev/null); do
  for K in $(aws iam list-access-keys --user-name "$U" --query "AccessKeyMetadata[].AccessKeyId" --output text 2>/dev/null); do
    echo -n "   ${U} / ${K:0:8}…  "
    aws iam get-access-key-last-used --access-key-id "$K" \
      --query "AccessKeyLastUsed.{When:LastUsedDate,Svc:ServiceName,Region:Region}" --output text 2>&1
  done
done

# ═══ 8. CONTEXT: the legacy bucket ═══════════════════════════
hr "8. LEGACY BUCKET (context only — no changes)"
run aws s3api get-bucket-location --bucket "$BUCKET_OLD"
run aws s3api get-bucket-versioning --bucket "$BUCKET_OLD"
run aws s3api get-bucket-website --bucket "$BUCKET_OLD"
sub "Object count + total size (metadata only, contents not read)"
run aws s3 ls "s3://$BUCKET_OLD" --recursive --summarize --human-readable

# ═══ 9. DOES STAGING ALREADY EXIST? ══════════════════════════
hr "9. BUCKET INVENTORY"
run aws s3api list-buckets --query "Buckets[].{Name:Name,Created:CreationDate}" --output table

hr "AUDIT COMPLETE — NOTHING WAS MODIFIED"
echo "All commands were get-* / list-* / describe-* / head-*."
echo "Send the output back. Redact any AKIA… key IDs first."
