# Production Firestore rules deployment

`firebase/firestore.rules` is the source of truth for the default database in
`kings-talloc-1f638`. Firebase Spark and standard GitHub-hosted runners for this public
repository support this workflow without a billing upgrade or credit card.

## What happens after a merge

The CI Pipeline runs lint, unit tests, Firestore emulator tests, and browser tests.
Only a successful `main` push or manually requested `main` run can start **Deploy
production Firestore rules**. PRs never receive production credentials. The deployment
job serializes releases and rejects commits already superseded by a newer `main` commit,
so an obsolete run cannot overwrite newer rules or certify an outdated app release.

The job obtains a short-lived Google token, compares the live source with the checked-out
rules, validates a new immutable ruleset if needed, publishes it to the existing default
database release, and reads it back to verify the source. An unchanged file is verified
without creating another ruleset. Failures fail the job and appear in GitHub Actions.

The deployment uses the official Firebase Security Rules API. Its custom IAM role has
only four permissions: read the release, update the release, create a ruleset, and read
a ruleset. It cannot delete rulesets, alter indexes or database settings, or read/write
student documents directly. Rules themselves control client access, so review every
rules change as a security change.

## One-time connection

1. In GitHub **Settings → Environments**, create `firebase-production`. Restrict its
   deployment branches to **Selected branches and tags → main (branch)**. Keep production
   code protected by the repository's normal PR review and required CI checks.
2. Review `scripts/setupFirestoreRulesIdentity.sh`. A Google Cloud project administrator
   runs it once in Google Cloud Shell or another authenticated `gcloud` session. It creates
   a dedicated service account, a four-permission role, and a Workload Identity Federation
   provider. It enables only the IAM/credential/token and Rules APIs and does not link a
   billing account, create keys, change live rules, or modify Firestore data.
3. The provider accepts only this repository's immutable ID and owner ID, `main`, this
   exact CI workflow, the `firebase-production` environment, and push/manual-run events.
   Forks, PRs, other branches, and other workflows cannot use it.
4. Add the two values printed by the script as **environment variables**, not secrets:
   `FIREBASE_RULES_IDENTITY_PROVIDER` and `FIREBASE_RULES_SERVICE_ACCOUNT`.
5. Allow several minutes for IAM propagation. Merge the reviewed workflow PR, then inspect
   its `main` CI run. The deployment job must succeed and report that the active rules
   match the commit. Use **Actions → CI Pipeline → Run workflow → main** to retry without
   manufacturing a source change. A manual run also runs all tests first.

Do not paste tokens or service-account keys into GitHub, chat, or the repository. No
production secrets are needed by this workflow. The old `FIREBASE_TOKEN` secret is no
longer consumed by CI; an administrator can revoke it after checking for any other users.

## Keeping app releases compatible

Vercel's Git deployment and GitHub Actions run independently. This workflow alone does
not hold back the web app while rules are deploying. If Vercel Deployment Checks are
available, require **Deploy production Firestore rules** in the project's production
deployment checks; confirm a failed check actually prevents domain promotion.

Until that gate is configured, merge backward-compatible permission additions first,
wait for their deployment job to succeed and for rules propagation, then merge the app
code that uses them. Remove old permissions only after existing clients stop needing
them. Do not ship dependent code in the same ungated release and assume ordering.

## Emergency console changes and rollback

Prefer a rules PR and this tested pipeline. If an emergency requires editing the Firebase
console, immediately commit the same change to `firebase/firestore.rules`; otherwise the
next successful `main` deployment overwrites it. A manual pipeline run can repair drift
without another commit. This is deployment on merges, not continuous polling for console
edits.

To roll back, revert the relevant rules commit through a PR and let CI deploy the reverted
file. Review compatibility with the current app before removing permissions. The workflow
never deletes historical rulesets or automatically rolls back app releases.

References: [Firebase Rules deployment](https://firebase.google.com/docs/rules/manage-deploy),
[GitHub authentication to Google Cloud](https://github.com/google-github-actions/auth),
[Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).
