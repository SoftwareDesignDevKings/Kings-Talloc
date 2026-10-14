#!/usr/bin/env bash
# Run once in Google Cloud Shell after reviewing docs/firestore-rules-deployment.md.
# Creates a keyless identity for this repository; never changes Firestore data or billing.
set -euo pipefail

deployment_project='kings-talloc-1f638'
deployment_pool='github-firestore-rules'
deployment_provider='kings-talloc-main'
deployment_account='github-firestore-rules'
deployment_role='firestoreRulesDeployer'
deployment_permissions='firebaserules.releases.get,firebaserules.releases.update,firebaserules.rulesets.create,firebaserules.rulesets.get'
deployment_condition="assertion.repository_id == '1056861748' && assertion.repository_owner_id == '67812791' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref == 'SoftwareDesignDevKings/Kings-Talloc/.github/workflows/pipeline.yml@refs/heads/main' && assertion.sub == 'repo:SoftwareDesignDevKings/Kings-Talloc:environment:firebase-production' && (assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')"
deployment_mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id'

deployment_project_number="$(gcloud projects describe "$deployment_project" --format='value(projectNumber)')"
[[ "$deployment_project_number" =~ ^[0-9]+$ ]] || { echo 'Could not read the production project number.'; exit 1; }
deployment_account_email="$deployment_account@$deployment_project.iam.gserviceaccount.com"
deployment_pool_resource="projects/$deployment_project_number/locations/global/workloadIdentityPools/$deployment_pool"

gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firebaserules.googleapis.com \
    --project="$deployment_project"

if gcloud iam roles describe "$deployment_role" --project="$deployment_project" --format=json >/dev/null 2>&1; then
    gcloud iam roles describe "$deployment_role" --project="$deployment_project" --format=json |
        python3 -c 'import json,sys; r=json.load(sys.stdin); expected=set(sys.argv[1].split(",")); assert set(r["includedPermissions"]) == expected and not r.get("deleted"), "Existing deployment role differs; inspect it manually."' "$deployment_permissions"
else
    gcloud iam roles create "$deployment_role" --project="$deployment_project" \
        --title='Firestore Rules Deployer' --stage=GA --permissions="$deployment_permissions"
fi

if ! gcloud iam service-accounts describe "$deployment_account_email" --project="$deployment_project" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$deployment_account" --project="$deployment_project" \
        --display-name='GitHub Firestore rules deployment'
fi

if ! gcloud iam workload-identity-pools describe "$deployment_pool" --project="$deployment_project" --location=global >/dev/null 2>&1; then
    gcloud iam workload-identity-pools create "$deployment_pool" --project="$deployment_project" --location=global \
        --display-name='Kings-Talloc Firestore rules'
fi

if gcloud iam workload-identity-pools providers describe "$deployment_provider" \
    --project="$deployment_project" --location=global --workload-identity-pool="$deployment_pool" >/dev/null 2>&1; then
    gcloud iam workload-identity-pools providers describe "$deployment_provider" \
        --project="$deployment_project" --location=global --workload-identity-pool="$deployment_pool" --format=json |
        python3 -c 'import json,sys; p=json.load(sys.stdin); assert p.get("attributeCondition") == sys.argv[1] and p.get("attributeMapping") == {"google.subject":"assertion.sub","attribute.repository_id":"assertion.repository_id"} and p.get("oidc",{}).get("issuerUri") == "https://token.actions.githubusercontent.com" and not p.get("oidc",{}).get("allowedAudiences"), "Existing provider differs; inspect it manually."' "$deployment_condition"
else
    gcloud iam workload-identity-pools providers create-oidc "$deployment_provider" \
        --project="$deployment_project" --location=global --workload-identity-pool="$deployment_pool" \
        --display-name='Reviewed main deployment workflow' \
        --issuer-uri='https://token.actions.githubusercontent.com' \
        --attribute-mapping="$deployment_mapping" --attribute-condition="$deployment_condition"
fi

gcloud projects add-iam-policy-binding "$deployment_project" \
    --member="serviceAccount:$deployment_account_email" \
    --role="projects/$deployment_project/roles/$deployment_role" --condition=None --quiet >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$deployment_account_email" \
    --project="$deployment_project" --role='roles/iam.workloadIdentityUser' \
    --member="principalSet://iam.googleapis.com/$deployment_pool_resource/attribute.repository_id/1056861748" \
    --quiet >/dev/null

printf '\nSet these NON-SECRET GitHub environment variables in firebase-production:\n'
printf 'FIREBASE_RULES_IDENTITY_PROVIDER=%s/providers/%s\n' "$deployment_pool_resource" "$deployment_provider"
printf 'FIREBASE_RULES_SERVICE_ACCOUNT=%s\n' "$deployment_account_email"
printf '\nAllow several minutes for Google IAM changes to propagate before the first deployment.\n'
