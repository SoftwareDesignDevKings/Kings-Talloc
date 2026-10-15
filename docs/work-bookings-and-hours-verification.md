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

- Unit suite: 23 suites / 123 tests passed, including 21 scheduling and hours fixtures and notification expiry/recovery tests.
- Firestore rules and scheduling integration: seven suites passed. The scheduling suite now covers 20 cases, including concurrency, failed-write rollback, idempotent retry, future recurring conflicts, subject eligibility, the exact approval boundary, coverage-loss notices, ownership and bypass attempts.
- Five browser scenarios cover student booking during Work and named group members; teacher approval and student notice; availability without a type selector; teacher completion; distinct Monday exports and non-blocking short-shift warnings; and cross-tab acknowledgement with the five-total/three-new example.
- The cross-tab test uses real browser tabs, Firestore snapshots and browser storage events, with controlled focus/visibility signals because this host's Chromium automation keeps background targets focused. Native window-focus behavior is not certified by this automated run.
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

Publish the compatible app/server routes before stricter scheduling rules. Allow the existing version guard to reload older tabs (its interval is five minutes), then verify the GitHub rules-deployment job against the same app commit. Refresh an old tab before retrying a write rejected during the transition. Review and coordinate this release with the separate UI branch; isolation prevents working-directory interference, but shared components may need merge reconciliation.

The dedicated browser suite runs with `npm run test:e2e:work-hours`. It uses port 3100 and separate Firestore/Auth emulators on 8180/9199 with project `demo-talloc-work-hours`; it never clears the other development app's data. CI runs this suite after the existing browser regressions.
