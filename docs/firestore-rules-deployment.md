# Production Firestore rules deployment

`firebase/firestore.rules` is the final, migrated rules source for the default database
in `kings-talloc-1f638`. Before migration is acknowledged,
`firebase/firestore.compat.rules` preserves the exact pre-PR143 calendar permissions
and adds recipient-only booking notifications. Firebase Spark and standard GitHub-hosted runners for this public
repository support this workflow without a billing upgrade or credit card.

## What happens after a merge

The CI Pipeline runs lint, unit tests, Firestore emulator tests, and browser tests.
Only a successful `main` push or manually requested `main` run can start **Deploy
production Firestore rules**. PRs never receive production credentials. The deployment
job serializes releases and rejects commits already superseded by a newer `main` commit,
so an obsolete run cannot overwrite newer rules or certify an outdated app release.

The job obtains a short-lived Google token, compares the live source with the checked-out
selected rules, validates a new immutable ruleset if needed, publishes it to the existing default
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
5. Allow several minutes for IAM propagation. Complete the first scheduling rollout
   below before expecting rules publication. Inspect the latest `main` CI run: the
   deployment job must succeed and report that the active rules match the commit. Use **Actions → CI Pipeline → Run workflow → main** to retry without
   manufacturing a source change. A manual run also runs all tests first.

Do not paste tokens or service-account keys into GitHub, chat, or the repository. No
production secrets are needed by this workflow. The old `FIREBASE_TOKEN` secret is no
longer consumed by CI; an administrator can revoke it after checking for any other users.

## Keeping app releases compatible

Vercel's Git deployment and GitHub Actions run independently. The scheduling rules
job waits for `/version.json` on the production domain to identify the exact tested
commit and scheduling API version, then waits five minutes and checks again. It selects
the strict stage only when the `firebase-production` environment variable is
`SCHEDULING_CLIENT_MIGRATION_ACK=server-writes-v1`. Leave that variable unset until
the first-rollout procedure below is complete. An unset value selects the temporary
compatibility rules; the exact value selects the strict rules. Any other value stops
publication before credentials are obtained.

The compatibility stage can only replace the exact legacy production source, or verify
that the compatibility source is already active. The deployer compares the source before
creating a ruleset. It refuses to replace already strict rules or an unreviewed production
hotfix. Removing the acknowledgement after migration cannot silently reopen calendar
writes. The compatibility baseline is checked against its pre-PR143 SHA-256 in CI.

Both stages still require successful tests, the exact deployed app commit/API version,
the five-minute interval and a final main/production recheck. Only the strict stage
requires legacy-client migration confirmation. Compatibility publication enables live
booking notices and their own acknowledgement state without a polling API or new index.

Do **not** make production domain promotion depend on **Deploy production Firestore
rules**: that job waits for the app to be live, so such a check would deadlock this
release sequence. App CI can be required before promotion. The compatibility
stage retains calendar access while the new server-writing app is promoted and existing
clients migrate. The final strict rules remove direct calendar writes; they must follow
the app release and migration acknowledgement.

### First scheduling rollout

A separate staging SSO URL is not a prerequisite when the maintainer cannot register
another Microsoft redirect. Keep write/hour verification in isolated emulators and
perform the real OAuth/deployed smoke test below on the existing approved domain.
Record that this deployed path was unverified before promotion; local credentials
providers do not exercise Microsoft OAuth.

The current production build was observed returning 404 for `/version.json`. An old
VersionGuard records its first successful response without reloading. Consequently,
waiting five minutes after the first version-enabled deployment does **not** refresh
those tabs. A new guard shipped in PR143 cannot alter JavaScript already running.

1. Before the scheduling release, publish a small, separately reviewed metadata
   bootstrap on the existing production app: configure Vercel's build command as
   `npm run build` so the existing generator publishes a non-empty `build` in
   `/version.json`. Keep existing app behavior and rules during this stage.
2. Verify the metadata on the production domain. Keep this bootstrap live for at
   least one full five-minute polling interval while active users have their tabs
   open. Record the bootstrap build and time in the release record.
3. Release the scheduling app with the old calendar rules still active. The successful
   main workflow then publishes the additive compatibility notification rules. Verify
   Microsoft sign-in, the deployed app's commit/API metadata, and a controlled
   booking/completion/hours smoke test with designated test accounts. Wait another
   full polling interval and verify an old active tab reloads onto the new app.
4. Arrange for returning users to refresh/reopen dormant or offline legacy tabs
   before using the calendar. Polling cannot prove that all old tabs have run. If
   legacy users cannot be accounted for, keep the compatibility rules and leave the
   acknowledgement unset; use a coordinated maintenance window to complete migration.
5. After the release owner has confirmed the migration, set the environment variable
   above and rerun the latest successful `main` CI workflow. The existing exact-commit,
   five-minute, and superseded-commit checks still run before final rules publication.
   Retain the acknowledgement for subsequent server-writing releases. Clear it if
   rolling the app back to a client-writing release so a future migration is reviewed.
6. Verify the active rules and a freshly signed-in calendar session. A rules API
   readback confirms publication, not instantaneous propagation to every client.

This is a release prerequisite, not a claim that a timer certifies all browser tabs.
No production bootstrap, app promotion, rules publication or acknowledgement is
performed by preparing this PR.

## Emergency console changes and rollback

Prefer a rules PR and this tested pipeline. If an emergency requires editing the Firebase
console, immediately commit the same change to `firebase/firestore.rules`; otherwise the
next successful `main` deployment overwrites it. A manual pipeline run can repair drift
without another commit. This is deployment on merges, not continuous polling for console
edits.

To return to a client-writing app, first restore and verify its compatible rules through
a reviewed rules PR while the current server-writing app is live. That rollback PR
must explicitly authorize replacing the exact current strict source: the ordinary
compatibility stage refuses to overwrite strict or separately modified rules. Then roll back the app
and clear `SCHEDULING_CLIENT_MIGRATION_ACK`. Clearing the acknowledgement alone is not a rules rollback. Review data compatibility before either step. The workflow
never deletes historical rulesets or automatically rolls back app releases.

References: [Firebase Rules deployment](https://firebase.google.com/docs/rules/manage-deploy),
[GitHub authentication to Google Cloud](https://github.com/google-github-actions/auth),
[Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).
