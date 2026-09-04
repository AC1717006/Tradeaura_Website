#!/usr/bin/env bash
# TradeAura — Phase 2 SES bootstrap. Run in AWS CloudShell (account 748999352674).
# Creates ONLY:
#   1. SES domain identity auraautomation.site in ap-south-1 (skips if present)
#   2. IAM user gym-ses-sender with ONE inline permission: ses:SendEmail,
#      resource-restricted to that single identity ARN
#   3. one access key for that user (only if the user has none)
# Touches NOTHING else: no deletes, no modifications to existing users/roles
# (TradeAuraBackupRole, TradeAuraSiteDeploy untouched), no S3/EC2/CloudFront/DB.
set -euo pipefail
R=ap-south-1
D=auraautomation.site
ACC=748999352674
U=gym-ses-sender

echo "── 1. SES domain identity ($D, $R)"
if aws sesv2 get-email-identity --region "$R" --email-identity "$D" >/dev/null 2>&1; then
  echo "   identity already exists — not recreating"
else
  aws sesv2 create-email-identity --region "$R" --email-identity "$D" >/dev/null
  echo "   created"
fi
echo "── 2. DKIM CNAME records → add these three in Hostinger DNS:"
aws sesv2 get-email-identity --region "$R" --email-identity "$D" \
  --query 'DkimAttributes.Tokens' --output text | tr '\t' '\n' | while read -r t; do
  echo "   CNAME   ${t}._domainkey.${D}   →   ${t}.dkim.amazonses.com"
done
echo "── 3. IAM user $U (ses:SendEmail on this one identity only)"
aws iam get-user --user-name "$U" >/dev/null 2>&1 && echo "   user already exists" || { aws iam create-user --user-name "$U" >/dev/null; echo "   created"; }
cat > /tmp/ses-send-policy.json <<POLICY
{ "Version": "2012-10-17",
  "Statement": [ { "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:${R}:${ACC}:identity/${D}" } ] }
POLICY
aws iam put-user-policy --user-name "$U" --policy-name send-onboarding-email --policy-document file:///tmp/ses-send-policy.json
echo "   inline policy send-onboarding-email applied (ses:SendEmail → identity/${D} only)"
echo "── 4. access key"
NKEYS=$(aws iam list-access-keys --user-name "$U" --query 'length(AccessKeyMetadata)' --output text)
if [ "$NKEYS" != "0" ]; then
  echo "   user already has $NKEYS key(s) — NOT creating another. Reuse it, or delete it in the console first."
else
  echo "   AccessKeyId and SecretAccessKey (shown ONCE — paste into the EC2 .env as GYM_EMAIL_AWS_KEY / GYM_EMAIL_AWS_SECRET):"
  aws iam create-access-key --user-name "$U" --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
fi
echo "── done. Nothing else was touched."
