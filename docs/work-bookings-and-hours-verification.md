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

The GitHub rules job now waits for production version metadata matching the exact tested commit and scheduling API version, gives the existing version guard five minutes to refresh open tabs, and rechecks both production and the main branch before obtaining deployment credentials. If the app deployment fails or main advances, rules publication fails closed. Refresh an old tab before retrying a write rejected during the transition. Review and coordinate this release with the separate UI branch; isolation prevents working-directory interference, but shared components may need merge reconciliation.

The dedicated browser suite runs with `npm run test:e2e:work-hours`. It uses port 3100 and separate Firestore/Auth emulators on 8180/9199 with project `demo-talloc-work-hours`; it never clears the other development app's data. CI runs this suite after the existing browser regressions.

## Review corrections before PR

- Group-name, class and recurrence edits now recheck conflicts; an empty submitted student list cannot bypass the one-tutor rule. Canonical student ownership is applied before validation.
- Legacy class rosters are resolved where cached data exists. Unknown class bookings remain occupied and visibly warn. Saved Work and student sessions retain their purpose. Removing the last known participant is allowed while editing but rejected on save; replacing them preserves approval and origin. Cached class metadata cannot silently refill or reclassify that edit.
- Editing an old open-ended series no longer imposes a 52-occurrence cutoff. Occurrences beyond the first year can be completed. Future recurrence changes are checked against already stored future commitments and pending requests, including dates beyond one year. Extending a booked series resolves competing pending requests atomically.
- Whole-series deletion uses the base document ID. Coverage-loss checks include adjoining support and older recurring Work; bookings remain intact and Michael receives the warning.
- Free intervals retain remote/onsite information. Teacher tutor options now use the combined Work/availability coverage, subtracting occupied bookings.
- The summary uses the existing deployed start-date index, retains last-loaded results on failure, rejects stale asynchronous results, and requires a current result for export. Short/complex warnings themselves never block export. Word warning paragraphs preserve section markup.
- Recurring meeting edits/moves update the occurrence, rather than losing the follow-up or moving the whole series. Duplicates reset all meeting identifiers and completion; pending student duplicates cannot create meetings before approval. Reassignment notifies a newly assigned tutor.
- All loaded booking notices are visible in a scrollable area before dismissal; acknowledgement uses a transaction so a stale tab cannot move the shared watermark backwards.
- Rules deployment is gated on the matching live app, with a refresh grace period and superseded-commit checks. Browser regressions start Auth as well as Firestore and seed explicit role/auth fixtures.

The agreed manual handling of complex days remains intentional. This review found implementation defects, not further business-policy decisions. Production data and live Teams/email integrations were not exercised.

## Participant safeguards and discussion coverage

- A teacher can clear the student selector, choose a replacement, and save normally. The form shows no validation error merely for removing someone. An empty save shows an inline message, keeps the modal open, and sends no write. The server repeats the safeguard for direct edits, approval and recurring detachment; rejected saves leave the booking and recurrence untouched.
- Named group members count as participants. Blank/whitespace names do not satisfy the rule. A replacement account must still have an eligible assigned tutor. Approval, completion, creation time and student-created origin are preserved on valid replacement.
- Saved general Work cannot become a student booking by adding names, accounts or a class. Create a separate student session instead. Cancelling a student session preserves its supporting Work/availability and restores bookability.
- Explicit payment cases now include standalone no-shows, the nine combinations of completed/incomplete/no-show Work and nested session, group size and names-only groups, adjoining Work/student sessions in both orders, two tutors' department totals, exact threshold arithmetic, Coaching minimum warnings, and teacher-managed covering Work that only changes pay when completed.
- The cross-report example has completed Work plus student bookings and a separate short Coaching shift, with uncompleted covering Work and a no-show excluded from pay. Completed totals are Work 4.5 + Coaching 1.5 = 6 hours in the dashboard, summary, actual CSV and Word exports. The allocated estimate remains separately labelled at 8.5 hours. Complex/short warnings remain visible and exportable.

No audit-history feature or new purpose field was added. Unresolved class-only legacy records remain conservatively occupied and flagged for review.
