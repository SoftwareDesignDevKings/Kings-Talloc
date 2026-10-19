# Work bookings and hours — implementation and verification

Branch: `codex/work-bookings-hours`, isolated from the UI branch and based on main at `d6eeffa`.

## Delivered

- Work and Coaching event types, with student sessions distinguished by their participants. Academic tutor availability has no type selector. Existing coaching-only availability stays separate.
- One server-side scheduling service for calendar creation, editing, moves, duplication, approval, completion, cancellation and recurring-instance changes. Direct client scheduling writes are denied by the accompanying rules.
- Student-safe bookable intervals combining academic availability and general Work, subtracting approved student sessions and Coaching. The server rechecks the actual session dates and recurring commitments before accepting changes.
- All student requests stay pending until teacher/admin approval. Approval is allowed through the saved start plus 15 minutes. Per-tutor guards, transactional queries and idempotent operations prevent competing approvals or manual bookings from double-booking a tutor.
- Competing requests are denied atomically. Approval/denial notices go to students; assignment notices go to tutors; lost supporting coverage notifies Michael. Existing email and Teams follow-ups remain separate from successful scheduling.
- Teachers can manage shifts, complete work and access hours/timesheet exports. Students cannot cancel in the app. Obsolete acceptance fields and controls no longer affect pay or reminders.
- Shared completed-hours calculation, exact duration arithmetic, overlap counted once per tutor, agreed adjoining-shift break rules, warning-only minimums and complex-case review. Dashboard cost totals, CSV and Word use the same calculation.
- Actual Sydney dates determine report grouping. Multiweek exports contain separate weekly Word files in a ZIP. Historical dates use the new calculation when viewed/exported; existing documents and approval statuses are not rewritten.

## Verification

- Unit suite: 27 suites / 157 tests passed, including 43 scheduling and hours cases and notification expiry/recovery tests.
- Firestore rules and scheduling integration: seven suites passed (174 tests). The scheduling suite now covers 45 cases, including concurrency, failed-write rollback, idempotent retry, future recurring conflicts, subject eligibility, the exact approval boundary, coverage-loss notices, ownership and bypass attempts.
- Eight browser scenarios cover student booking during Work and named group members; teacher approval and student notice; availability without a type selector; teacher completion; distinct Monday exports and non-blocking short-shift warnings; cross-tab acknowledgement with the five-total/three-new example; editable removal followed by replacement with an error only on empty save; blocking saved Work from gaining student-booking behaviour; and one complex case matching dashboard, summary, downloaded CSV and Word, including a non-blocking Coaching-minimum warning.
- The cross-tab test uses real browser tabs, Firestore snapshots and browser storage events, with controlled focus/visibility signals because this host's Chromium automation keeps background targets focused. Native window-focus behavior is not certified by this automated run.
- Existing browser regressions: the 11 selected admin, approvals, tutor and coaching scenarios passed, including a targeted rerun after updating the old decimal-hours assertion. Three native-focus scenarios were excluded on this host; the dedicated two-tab flow covers acknowledgement with controlled focus signals.
- Lint, whitespace checks and production build passed. Local builds still report the pre-existing Upstash Edge-runtime warning and missing local Redis settings.
- Teams calls in browser tests use the app's development mocks. No production bookings, emails, meetings, database rules or deployments were changed.

## Representative historical differences

| Completed entries for one tutor | Previous summary | New shared result |
| --- | --- | --- |
| Work 1–3 plus Work 2–4 | 4 hours | 3 hours |
| Work 3–5 plus student session 3:30–4 | 2.5 hours | 2 hours |
| Work 9–11 immediately followed by Work 11–1 | 4 hours | 3.5 hours |
| Two student sessions 9–11 and 11–1 | 4 hours | 4 hours, review warning |
| Completed work with an old confirmation requirement and no response | Could be excluded | Counts normally |
| Three hours on each of two different Mondays | Export combined them and deducted a break | Two weekly rows of 3 hours |

These are regression fixtures, not a recalculation of production records.

## Human review and release

Complex mixed sequences, separate short sessions and unresolved class-only legacy entries remain flagged for teacher review. A teacher can record one covering general Work shift where appropriate, keeping student bookings and counting shared time once. Exports remain available for manual correction; the warning case's displayed figure is provisional.

The GitHub rules job now waits for production version metadata matching the exact tested commit and scheduling API version, requires the release owner’s one-time legacy-client migration acknowledgement, allows five minutes for active bootstrapped tabs to refresh, and rechecks both production and the main branch before obtaining deployment credentials. If the app deployment fails or main advances, rules publication fails closed. Refresh an old tab before retrying a write rejected during the transition. Review and coordinate this release with the separate UI branch; isolation prevents working-directory interference, but shared components may need merge reconciliation.

The dedicated browser suite runs with `npm run test:e2e:work-hours`. It uses port 3100 and separate Firestore/Auth emulators on 8180/9199 with project `demo-talloc-work-hours`; it never clears the other development app's data. CI runs this suite after the existing browser regressions.

## Review corrections before PR

- Group-name, class and recurrence edits now recheck conflicts; an empty submitted student list cannot bypass the one-tutor rule. Canonical student ownership is applied before validation.
- Legacy class rosters are resolved where cached data exists. Unknown class bookings remain occupied and visibly warn. Saved Work and student sessions retain their purpose. Removing the last known participant is allowed while editing but rejected on save; replacing them preserves approval and origin. Cached class metadata cannot silently refill or reclassify that edit.
- Editing an old open-ended series no longer imposes a 52-occurrence cutoff. Occurrences beyond the first year can be completed. Future recurrence changes are checked against already stored future commitments and pending requests, including dates beyond one year. Extending a booked series resolves competing pending requests atomically.
- Whole-series deletion uses the base document ID. Coverage-loss checks include adjoining support and older recurring Work; bookings remain intact and Michael receives the warning.
- Free intervals retain remote/onsite information. Teacher tutor options now use the combined Work/availability coverage, subtracting occupied bookings.
- The summary uses the existing deployed start-date index, retains last-loaded results on failure, rejects stale asynchronous results, and requires a current result for export. Short/complex warnings themselves never block export. Word warning paragraphs preserve section markup.
- Recurring meeting edits/moves update the occurrence, rather than losing the follow-up or moving the whole series. Duplicates reset all meeting identifiers and completion; pending student duplicates cannot create meetings before approval. Assigned sessions appear in the existing events list; no separate tutor assignment banner is shown.
- All loaded booking notices are visible in a scrollable area before dismissal; acknowledgement uses a transaction so a stale tab cannot move the shared watermark backwards.
- Rules deployment is gated on the matching live app, with a refresh grace period and superseded-commit checks. Browser regressions start Auth as well as Firestore and seed explicit role/auth fixtures.

The agreed manual handling of complex days remains intentional. This review found implementation defects, not further business-policy decisions. Production data and live Teams/email integrations were not exercised.

## Participant safeguards and discussion coverage

- A teacher can clear the student selector, choose a replacement, and save normally. The form shows no validation error merely for removing someone. An empty save shows an inline message, keeps the modal open, and sends no write. The server repeats the safeguard for direct edits, approval and recurring detachment; rejected saves leave the booking and recurrence untouched.
- Group bookings use selected student accounts. The separate names field is removed from both forms. A replacement account must still have an eligible assigned tutor. Approval, completion, creation time and student-created origin are preserved on valid replacement.
- Saved general Work cannot become a student booking by adding names, accounts or a class. Create a separate student session instead. Cancelling a student session preserves its supporting Work/availability and restores bookability.
- Explicit payment cases now include standalone no-shows, the nine combinations of completed/incomplete/no-show Work and nested session, selected group size and legacy names-only compatibility, adjoining Work/student sessions in both orders, two tutors' department totals, exact threshold arithmetic, Coaching minimum warnings, and teacher-managed covering Work that only changes pay when completed.
- The cross-report example has completed Work plus student bookings and a separate short Coaching shift, with uncompleted covering Work and a no-show excluded from pay. Completed totals are Work 4.5 + Coaching 1.5 = 6 hours in the dashboard, summary, actual CSV and Word exports. The allocated estimate remains separately labelled at 8.5 hours. Complex/short warnings remain visible and exportable.

No audit-history feature or new purpose field was added. Unresolved class-only legacy records remain conservatively occupied and flagged for review.

## Student-selected groups

- Students can search the synced student names/emails through an authenticated endpoint requiring two characters and returning at most twenty matches. The endpoint projects only name/email and leaves full Canvas document rules unchanged.
- The requester is always included, deduplicated and stored by the server. Adding a classmate does not grant that classmate edit, move, resize or duplicate access to the request. Approved bookings remain teacher-managed.
- Availability filters and transaction-time checks require a tutor eligible for every selected student. Eligibility is checked again on approval; a rejected approval leaves the pending request intact. Every selected student receives the decision.
- Selected group size does not multiply paid hours. The existing empty-save and saved-Work-purpose safeguards still apply through the single Students selector.
- Local verification: full unit suite, the isolated approval emulator suite and browser checks cover group creation, fixed requester, ineligible peer filtering, teacher review and participant replacement.

Tutor assignment banners have been removed, including hiding older stored assignment notices. Student approval/denial updates and Michael’s lost-coverage warnings remain. No production notification records are deleted.

Dashboard approval badges are visible for teachers/admins and students, and hidden in tutor/coach views in both Today and Upcoming Events. Event details and participant counts remain visible.


## Rejection and deletion safeguards (16/10/2026)

- Reject retains a denied request and sends an in-app decision to each student. Delete permanently removes the request and its existing decision notices in one transaction, without generating a false rejection.
- Both actions require confirmation and use red controls. Request deletion explicitly warns that students will lose visibility of the rejection and suggests Reject to preserve it. Teachers/admins can delete pending or denied requests; students and tutors cannot.
- Calendar single-event deletions now use the existing deletion confirmation, including recurring scope choices. Availability, app-account, subject, tutor-assignment and Canvas-whitelist removals require confirmation. Removing a saved Teams meeting or removing completed paid hours confirms before saving; their Save controls turn red. The keyboard completion shortcut also confirms removing completed hours. Unsaved participant replacement remains unrestricted until save validation.
- Calendar requests receive their canonical request marker when loaded; approved shifts clear stale request markers. Fast cancellation during Bootstrap modal transitions restores the editor and still allows closing it.
- A permanent request deletion must carry the new explicit intent; older open clients receive a refresh message instead of unexpectedly deleting a request.
- Validation: 214 unit tests (38 suites), 63 scheduling integration tests on the isolated emulator, all 10 dedicated browser flows, lint and whitespace checks. After the final compatibility safeguard, both deletion browser flows were rerun successfully. Database cases include rejection visibility, unrelated-notice preservation, rollback, permission checks, idempotency, concurrent approval/deletion and old-client protection. Production and demo records were not deleted during verification.


## Account security fixes (16/10/2026)

- Personal calendar keys are stored in a server-only collection, omitted from sessions/shared user profiles, and checked against the live account version. Old public keys are never accepted or reused. Signing in removes an obsolete public field; no historical token backfill is needed.
- Profile creation and role changes run on the server. Verified first-time production logins create student accounts only. Administrators use the existing account screen through the secured API; teachers assign subjects to existing accounts rather than creating tutor profiles implicitly. Student introduction acknowledgements still work independently.
- APIs and token refresh read current account roles/status. Firestore rules check the app-issued identity, current profile, revocation marker and session version. Role changes invalidate old app/Firebase credentials and personal calendar links. Ordinary name, notification and subject-coverage edits preserve sessions.
- Account deletion atomically revokes access, removes the profile and removes the private calendar key before Auth cleanup. Cleanup failure cannot restore access. Login cannot silently recreate a deleted account; explicit admin recreation gives it a new version, so old cookies and Firebase tokens stay invalid. Revoked sessions return cleanly to sign-in without a redirect loop.
- Validation: 231 unit tests across 39 suites; 203 Firestore rules/scheduling integration tests across eight suites; all 14 dedicated browser flows, including actual account-screen creation/editing, private calendar access, current-cookie demotion and deletion/recreation. The four security browser flows were repeated with the final identity binding. Lint, whitespace checks and an isolated production build pass. Existing local Redis/Edge-runtime warnings remain.

Release notes: deploy the app and accompanying rules through the existing coordinated pipeline. Existing personal calendar subscribers must replace their old subscription with a newly generated link. A user whose roles change must sign in again. Production accounts, calendar links and rules were not changed during this work. Dependency vulnerabilities and availability-query resource limits are addressed in the follow-up below.


## Dependency and availability hardening (16/10/2026)

- Update Next.js within its existing 15.5 release line, NextAuth, the HTML sanitizer, Firebase Admin and vulnerable indirect dependencies. Move the app and both CI jobs to Node 22, with `.nvmrc` and `package.json` keeping the runtime consistent. Firebase initialization and the existing migration script use the supported modular API; no migration script or production data write was run.
- The production dependency audit now reports **zero known vulnerabilities**, compared with 26 before these updates. A CI check rejects high/critical production dependency advisories. Development-tool advisories remain outside the production tree; no forced tooling downgrade or framework major migration was applied. Sanitizer regressions cover the previously reproduced raw-text/script bypass, unsafe links and malformed markup. Sharp AVIF decoding/PNG conversion works with its patched native libraries.
- Availability reads only date-overlapping commitments, already-started recurring bases and tutor profiles. Group eligibility is checked before schedule reads; an empty intersection skips them entirely. Existing role-only and secondary-role tutors remain supported. Class-only legacy bookings remain occupied without loading class rosters. Ordinary approval/report reads also use date bounds, while recurring edits deliberately retain their wider future-conflict validation.
- The availability endpoint has one **120 requests/minute per account** limit. Normal polling is twice per minute. It is exempt from the existing shared-IP limit, so students on the school network do not consume one availability allowance. Existing configured Redis shares the account limit across instances; if absent/unavailable, a bounded in-memory limiter applies per server instance. This fallback does not guarantee a deployment-wide quota and needs no new paid service.
- Each availability query reads at most 5,001 documents and errors if more than 5,000 match; more than 1,000 matching entries for one tutor also requires a smaller range. Results are never silently truncated or presented as an empty success. Availability uses the existing one-day duration limit. Historical recurring commitments expand near the requested dates, retaining Sydney time, occurrence IDs and exceptions. Unexpected multi-day recurring records need review instead of unbounded expansion.
- Hidden/offline tabs pause availability polling. Duplicate in-flight reads are coalesced; a schedule change queues one fresh result. A stalled read times out after 20 seconds and later refreshes can recover. Errors retain last-known slots and disable booking until a current refresh succeeds; the scheduling transaction still validates every booking and approval.
- Validation under Node 22: 256 unit tests (43 suites), all 203 Firestore rules/scheduling tests, all 15 dedicated browser flows, repository lint plus explicit JSX lint, whitespace checks and an isolated production build. After the final shared-query change, booking/approval, weekly exports, dashboard/CSV/Word parity and recurring availability were checked again. A parallel build/test run exceeded local browser startup deadlines; the four affected flows passed when run independently with a 120-second diagnostic timeout (38, 6, 3 and 2 seconds). Production records, rules, deployment settings and the other chat's running app were not changed. The review demo was restarted on Node 22 and its local rules refreshed without changing fixture records.

The existing start/end and recurring/start indexes cover the new shift queries. No new Firestore composite index or additional deployment permission is required. Package runtime configuration selects Node 22 for the next Vercel deployment; the current production runtime is unchanged until release. Sources: [Node runtime configuration](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Firebase Admin v14 compatibility changes](https://github.com/firebase/firebase-admin-node/releases/tag/v14.0.0), [sanitizer changelog](https://github.com/apostrophecms/apostrophe/blob/main/packages/sanitize-html/CHANGELOG.md).


## Production/PR regression comparison (16/10/2026)

Compared the successful GitHub Production deployment `7055561513` at `d6eeffa16c6b66fdcd53132a85f649dcc0090521` with PR application commit `d7b539000fd2901a29f71dab00d1cbd283d20f0c`. The custom domain was unavailable to inspection tools, so the successful deployment record pins the baseline. Both versions ran locally with isolated synthetic Firestore data, their own rules, dedicated Auth emulators and independent locked dependency installations. Only the baseline's development emulator port wiring was adapted.

- 25 shared browser scenarios passed on both versions. The PR also passed its HTTP approval-outage/retry scenario, which is skipped for the baseline because the old approval path is a client Firestore transaction.
- All eight development roles were exercised. The initial candidate and production both logged Coach + Tutor calendar permission errors with its mixed-case email. The follow-up below fixes this and retests the affected identities.
- Nineteen hours fixtures were compared through the summary, actual CSV downloads and parsed Word files. Explicit PR expectations cover every fixture and completed dashboard totals. Unit suites passed: baseline 102 tests / 22 suites; PR 256 tests / 43 suites.
- No confirmed new application regressions were found in these covered cases. The observed booking, approval, report, security and UI changes match the agreed requirements.

| Case | Production | PR |
| --- | --- | --- |
| General Work provides student availability | No | Yes; student request remains pending |
| Work joined to adjoining availability | Not combined | Continuous coverage is bookable |
| Student booking over an approved session or Coaching | Tutor is offered | Tutor is unavailable |
| Work 13:00–15:00 plus Work 14:00–16:00 | Summary 4h; Word 3.5h | Summary, CSV and Word 3h |
| Work 09:00–11:00 plus Work 11:00–13:00 | Summary 4h; Word 3.5h | All 3.5h |
| Work 09:00–12:00 plus student session 10:00–11:00 | Summary 4h; Word 3.5h | All 3h |
| Adjacent 2h student sessions | Summary 4h; Word 3.5h | All 4h with complex-day warning |
| Two separate Mondays, 3h each | One Word file combines 5.5h | Two weekly files, 3h each |
| Short Work / Coaching export | Minimum-hours error blocks export | Actual hours export with warning |
| Completed Work with unanswered legacy confirmation | Missing from summary, included in Word | Included consistently |
| Other pending request after conflicting approval | Remains pending | Denied atomically, students notified |
| Demoted admin's old session/token | API and Firestore reads still succeed | API 401; Firestore 403 |

Preserved cases include ordinary availability bookings, tutor/coach completion, approved-student read-only access, break thresholds, separate dates and Work/Coaching categories, and the two-tab `(3)` → acknowledgement → five outstanding → four after approval workflow. Student decision notices, teacher reporting access, Coach dashboard cards, type simplification and deletion confirmations appear as planned.

This comparison does not exercise real Microsoft OAuth, Graph delivery, Redis deployment behavior, production indexes or deployment configuration. The headless title test simulates focus/visibility signals while using real snapshots and localStorage events. Existing emulator/unit suites cover additional recurrence, concurrency, ownership, group eligibility and expiry cases; those are not all duplicated as comparative UI scenarios.

### Repeating the comparison

Use Node 22, Java and the installed Playwright browser. From the PR checkout:

```sh
npm run test:regression-comparison -- d6eeffa16c6b66fdcd53132a85f649dcc0090521
```

Optional Playwright arguments follow the commit, for example `--grep=hours-matrix`. The command archives both commits into temporary directories, installs each lockfile separately, starts its own Firestore/Auth emulators sequentially, runs the same browser cases and retains screenshots, semantic saved records, console/HTTP errors, CSV, Word and traces under `test-results/comparison-*`. It does not reuse or stop an existing app. Ports 3120/3121, 8380, 9399/9499 and the associated 9390/9490 hubs must be free. The harness verifies the Auth token's project and email before clearing or populating Firestore fixtures. Its clearing guard permits only `demo-talloc-compare-*` projects.

The reusable runner itself was checked end to end on both versions with fresh services. Initial manual setup attempts exposed hard-coded emulator ports, the Auth emulator's default-project behavior, host network suspension and symlinked Next.js dependency resolution; those failures were isolated before the final results. They are recorded separately from product differences. Microsoft production sign-in and production data were not changed.


## Email identity and wider stability follow-up (16/10/2026)

Mixed-case legacy profile IDs are preserved. New profiles use lowercase IDs, and verified lower/upper-case sign-ins resolve the existing profile instead of creating another account. A bounded server lookup supports legacy IDs; ambiguous duplicates fail closed rather than borrowing either profile’s permissions. Calendar queries, rules, own hours, availability, personal feeds and notification preferences use the same identity. The additional rule alias is the server-signed profile ID, already required to match the authenticated email ignoring case. Foreign ownership queries and direct scheduling writes remain denied.

The three local demo Auth records have their missing email fields restored. The two accidental lowercase duplicate profiles were backed up and consolidated into their original mixed-case profiles, preserving their intended Tutor + Admin and Coach + Tutor roles and introduction preferences. All three sign-ins were checked through the demo login, session, Firebase ID-token exchange and calendar with no permission errors. No production records/rules or the other chat’s app were changed.

New stability probes reproduced and fixed:

| Case | Expected and verified result |
| --- | --- |
| Same student, overlapping requests with different tutors, approved concurrently | One succeeds; the competing request is denied atomically. Student guard records also serialize manual edits/approvals. |
| Student moves a request over their approved booking with a different tutor | Conflict; saved request is unchanged. Availability excludes the group’s existing commitments even with another ineligible tutor, without exposing appointment details. |
| Disabled tutor or duplicate case variants in participants | No new assignment to a disabled account; historical corrections remain possible. Duplicate identities become one participant. |
| Invalid completion status | Rejected without changing the saved shift or hours. |
| Stale teacher editor after tutor completion/time correction | Version conflict; completed hours and the other edit remain intact. Reopening the event allows a fresh save. Legacy records start at version zero. |
| Availability created then immediately edited | Live snapshots retain the server version; drafts cannot overwrite it. |
| Approval response lost after commit | Retry uses the same operation ID; one booking and one decision notice. Normal Teams follow-up writes are checked separately. |
| Approval crosses the 15-minute deadline during transaction reads | Entire transaction rolls back. A previously successful operation can still be retried after the deadline. |
| Student editing after approval | Cannot resurrect a pending request. |
| Every occurrence in a recurring series conflicts | No empty series is created, even when skipping conflicts. |
| Group boundary and operation ownership | The requester counts toward the 30-student ceiling; operation IDs cannot reuse another actor’s result. |
| Adjoining sessions with different tutors; general Work covering pending requests | Adjoining sessions remain possible; supporting Work does not deny requests. |
| Availability refresh fails, then recovers | Last-known slots retained, booking disabled until recovery, session topics preserved. |
| Nested/duplicate Work and different input orders | Paid time remains unchanged across all 24 input permutations; overlapping Work is not paid twice. Explicit participants override stale legacy flattened fields. |
| Existing pending request has a custom title | Student topic/focus edits preserve the title. |

Validation: **266 unit tests / 43 suites**, **223 Firestore rules and scheduling tests / nine suites**, and **32 PR browser scenarios** verified, including six new end-to-end stability workflows and the existing 19-example dashboard/CSV/Word hours matrix. Two sign-in smoke scenarios hit 20-second loading timeouts in the full run and passed on a focused rerun; navigation allowances now permit 60 seconds. The lost-response test was corrected to count approval requests only, excluding ordinary Teams metadata updates. The final availability create/edit/delete check passes after removing optimistic drafts that discarded revisions. Source/test/script ESLint (including JSX), whitespace checks and the independent Node 22 production build are checked with this follow-up.

The comparison report retains the production deployment baseline and updates candidate evidence. The test boundary remains local development sign-in and emulated data; real Microsoft OAuth, Graph delivery, production indexes and distributed Redis behavior are not certified by these checks. Native focus signals remain simulated in the two-tab acknowledgement test.


## Regression fixes and teacher-managed multi-tutor sessions

- Student submissions still select exactly one tutor in the UI and on the server. Teachers/admins can assign several tutors to one student session. Every tutor is checked for every selected student's eligibility and for scheduling conflicts; coverage-loss checks include all assigned tutors. Legacy sessions can be completed by a teacher or an assigned tutor, including detached recurring occurrences.
- Legacy timesheet template document IDs retain their original case. Export resolves them through a bounded lookup, while new uploads use canonical email IDs. A current canonical upload takes precedence over an older case variant; ambiguous legacy-only matches fail instead of selecting an arbitrary file.
- Teacher/admin calendars retain Coaching availability and its location/type filtering. Coaching-only coverage remains unavailable for student academic bookings. General Work continues to provide academic booking coverage.
- Teams creation and updates use the committed recurrence count and exceptions after conflict skipping. Recurrence dates/weekdays and occurrence lookups use Sydney wall time, including daylight saving. Skipped occurrences are removed after the series ID is saved; cleanup failure reports an unfinished follow-up, and update retries tolerate dates already removed. These paths were tested with mocked Microsoft responses, not live meeting delivery. Microsoft recurrence-range semantics follow the [Graph recurrence documentation](https://learn.microsoft.com/en-us/graph/outlook-schedule-recurring-events).
- The shared paid-hours module and break thresholds are unchanged. A new fixture confirms that a four-hour student session with two tutors and three students pays 3.5 hours per tutor, seven staff-hours total; overlapping completed Work is still counted only once for each tutor.

Validation: **283 unit tests in 45 suites**, **233 Firestore rules/scheduling tests in nine suites**, **six additional browser checks**, source/test lint including JSX, whitespace checks, and the repository's full Node 22 production build pass. The integration suite used disposable emulator port 8582 through local test copies with only the standard port remapped; the other running emulator was left untouched. Browser checks used separate demo Firestore/Auth projects and an anonymized production sample: 32 saved shift records plus 42 availability records for 5–18 October. Every staff member's CSV/hour totals remain unchanged at **85.25 hours** overall. Browser checks also verify legacy multi-tutor completion, a legacy mixed-case template download and creation/completion of a new teacher-assigned multi-tutor session. Production data and rules were not changed. Existing Redis Edge-runtime build warnings remain.


## Deployed runtime and release-readiness fixes (19 October 2026)

- The PR preview's `/login` failed with `ERR_REQUIRE_ESM`: Vercel disables native
  `require(esm)`, which the patched Firebase Auth/JWKS and HTML sanitizer dependencies
  require. Repository runtime configuration now enables Node's supported feature.
  A fresh-process test loads both real dependencies, checks sanitizer rejection of
  unsafe HTML, and verifies valid and invalid RSA signatures using a local JWKS fixture.
  The deployed preview login now renders successfully; no dependency security fixes
  were reverted.
- Vercel's dashboard build override used `next build`, bypassing the version generator.
  The repository now selects `npm run build`. The deployed preview's `/version.json`
  reports its exact Git commit and `schedulingApiVersion: 1`.
- The legacy browser suite now seeds stable profiles before saving login state,
  isolates scheduling data between tests, and explicitly confirms deletion/rejection.
  Test fixture writes refuse non-demo projects and non-local emulator hosts.
- Browser testing also reproduced a pre-existing modal initialization race when the
  async Bootstrap script loads after a calendar form opens. The modal now initializes
  on script readiness and honors the current open/closed state. A deterministic browser
  test withholds the actual Bootstrap bundle until after the form opens; the form then
  becomes usable. Unit tests cover delayed loading, closing and cleanup as well as the
  existing confirmation-animation cases.
- The first version-enabled deployment cannot refresh old tabs that previously received
  404: their first successful poll only sets a baseline. Rules deployment now requires
  `SCHEDULING_CLIENT_MIGRATION_ACK=server-writes-v1` in the production GitHub environment,
  in addition to the existing exact-commit and polling-interval checks. The
  [release procedure](firestore-rules-deployment.md) explains the separate metadata
  bootstrap, active-tab verification, dormant-tab migration, and app/rules rollback
  order. It also removes advice that would deadlock app promotion against a rules job
  waiting for that same app to be live. The acknowledgement remains unset by this work.

Local validation: **290 unit tests in 46 suites**, including **17 release/rules-publishing
checks**, and **15 non-Teams Playwright checks including authentication setup**, with
repository source/test lint and whitespace checks. The browser run used disposable
`demo-talloc-preproduction` Firestore/Auth emulators on ports 8584/9594 and app port 3151.
The dedicated Teams scenario was excluded; approval flows retain existing development
mocks and no live Microsoft meetings or messages were exercised.

The shared paid-hours calculation and event-rule modules are unchanged from the prior
regression-fix head. Earlier production-sample reconciliation remains applicable.
The deployed preview still points to production Firebase. The older `talloc-889d3`
project contains existing 2024 test data and is not a configured staging environment.
No new staging SSO URL will be introduced: the maintainer cannot register another
Microsoft redirect URL. Real Microsoft OAuth and deployed write checks remain pending
a controlled smoke test on the existing approved domain during rollout; emulator
authentication does not certify that path. Production data, rules, credentials and deployment
settings were not changed by these fixes.

After the shared modal fix, three additional payroll/export browser checks passed
against the published runtime source: all 27 staff/day buckets still total **85h 15m**,
CSV and weekly Word totals agree, all 20 saved templates render, and Sunday/Monday,
daylight-saving and partial-week boundaries pass. The local replay harness was updated
to wait for asynchronous dashboard cards before reading them.


## PR144: editor lifecycle and compatible booking notices

The first post-merge main CI run and its retry each passed 290 unit tests, 233 Firebase
checks and 16 existing browser checks, but two dedicated editor interactions timed out.
A follow-up diagnostic run records browser errors, failed request paths and modal state.
A separate deterministic lifecycle test reproduces a Bootstrap callback reading a disposed modal during
React StrictMode effect replay. Modal initialization now waits until the replay completes,
and unmounting lets opening/hiding transitions finish before disposal. Detached editors
are removed after transition cleanup, including when Bootstrap temporarily reattaches them. Quick confirmation cancellation and delayed Bootstrap
loading remain covered. Hosted diagnostics also show a student dropdown intercepted by
the next accordion header. Keeping the pointer on that header reproduces the timeout
locally. Modal dropdowns now stack above neighbouring headers, and the regression uses
normal clicks with the pointer left over the header. Event-opening checks select the
visible title rather than the centre of the drag/resize event wrapper. Three affected workflows pass twice each with 4x CPU throttling
against isolated emulators, and all ten modal/confirmation unit checks pass.

The production booking-updates warning is caused by new notification collections being
absent from the retained calendar rules. The new compatibility stage adds recipient-only
notice reads and validated own acknowledgement state to the exact pre-PR143 rules. Its
baseline SHA-256 is tested, and publication refuses to replace strict rules or a separate
production hotfix. The migration acknowledgement continues to gate strict calendar rules.
Both stages retain exact-commit production checks and the polling grace interval. This
keeps real-time notices without introducing frequent database/API polling. Six compatibility
emulator checks cover recipient isolation, mixed-case identities, acknowledgement validation,
server-only notices and retained legacy calendar writes. The browser also verifies own-notice
display and dismissal while another recipient's notice stays hidden.

The account-deletion browser check now waits for the completed AccessDenied redirect before
admin recreation. Its previous immediate login-URL assertion allowed the rejected sign-in
to race with recreating the account; old-token rejection remains checked after recreation.

Production booking/approval/completion write testing remains pending at the maintainer's
request. No production data or rules were changed by preparing these fixes; the shared
paid-hours calculations and intended break rules are unchanged.
