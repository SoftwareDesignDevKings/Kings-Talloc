# Work bookings and hours implementation plan

Implement the agreed booking and payment rules consistently across the calendar, approvals, dashboard, hours summary and exports. The workflow is tutor availability, teacher assignment or approval, then completion. There is no tutor acceptance step for either general Work or student sessions.

This plan includes removal of obsolete confirmation logic and the export bug that combines different Mondays. Apply the new calculations to historical dates when viewed or exported; previously downloaded files remain unchanged.

## 1 Simplify events and tutor availability

- Offer Work and Coaching as event types. Treat legacy `tutoring`, `tutoringOrWork` and `work` events as Work through a shared compatibility helper; keep Coaching separate.
- Within Work, derive general Work versus a student session from its student participants, including selected group members. Do not use `createdByStudent` to decide whether a tutor is busy: teacher-created student sessions reserve the tutor too. Keep the origin field for approval and ownership rules.
- A saved general Work record and a student session cannot switch purpose through participant edits. Teachers can temporarily remove a student while choosing a replacement, but saving a student session without any selected student must show a clear error and keep the editor open. To cancel it, use the existing Delete action; create a separate general Work event if needed. Book students during existing Work by creating a separate student session. Removing surrounding Work does not reclassify or delete a student session.
- Resolve class-linked legacy participants before classification. Flag unresolved legacy records for review rather than silently opening an existing class booking to other students.
- Remove the type selector from the tutor availability editor. Tutor-entered availability is a simple time range, retaining existing location information.
- Keep coaching availability separate internally and unavailable for academic bookings. Preserve old coaching-only availability and the coach workflow; removing the tutor selector must not turn coaching availability into tutoring availability.
- Keep existing academic tutor and subject eligibility. A student session classified as Work still requires an eligible tutor; renaming the event type must not bypass the existing tutor-role restriction.
- Use the existing multi-student selector for group bookings. Students search classmates by name or school email (minimum two characters, maximum twenty results) and remain included as the requester. Return only names/emails, not Canvas roster or enrollment documents. One tutor is assigned; group size does not multiply paid hours. Check tutor eligibility for every selected student. Group members can view their booking and receive decisions; only its requester can edit a pending request.
- Update calendar labels, filters, legends and instructions to match the simplified model. Preserve existing layouts where possible.

Primary areas: `EventForm`, `StudentEventForm`, `TutorAvailabilityForm`, event form sections, `useModalActionStrategy`, `calendarUI`, calendar filters, and a shared event-classification helper.

## 2 Use one booking availability calculation

For each eligible tutor, combine listed academic availability and general Work time, then subtract approved student sessions and Coaching commitments. The requested interval must be covered continuously. Adjacent coverage may come from different records; uncovered gaps cannot be booked by students. No travel or location buffer is added.

Use this calculation for the calendar overlay, tutor options, request creation and editing, drag, resize and duplication. Presentation filters must not change whether a time is actually bookable.

Students currently cannot read other students' bookings or general Work shifts. Provide an authenticated, student-safe availability endpoint using the existing Next.js server and Firebase Admin setup. Return eligible tutor free/busy intervals, without other students' identities, titles or descriptions. Refresh after relevant changes, on app return and before submission. Server validation must reject a stale slot even when the display has not refreshed yet.

Teachers and admins may arrange a student session outside listed availability or Work because they coordinate with the tutor. They must still satisfy tutor eligibility and booking conflict rules.

| Combination for one tutor | Behaviour |
| --- | --- |
| General Work and general Work | Allow overlap |
| General Work and student session | Allow overlap |
| Two pending student requests | Allow competing requests |
| Approved student session and another student session | Reject overlap |
| Coaching and another commitment | Preserve existing blocking behaviour |

Do not introduce student-level clash blocking across different tutors. Group sessions remain one booking with one tutor. Multiple tutors in a student session and overnight scheduling are outside scope.

Primary areas: `calendarAvailability`, `CalendarUIContext`, `CalendarContent`, `StudentEventForm`, `useEventFormData`, Firestore reads, and an authenticated availability endpoint.

## 3 Make scheduling changes consistent and atomic

Use one authoritative scheduling service behind authenticated server routes. The existing server authentication helpers can check both primary and additional roles. Validate roles, ownership, tutor eligibility, current request state and conflicts on the server; UI controls alone are insufficient.

Route all affected writes through this service, including approval, teacher creation and editing, moves, resizing, duplication, cancellation and recurring-instance changes. Reuse the per-tutor booking guards so simultaneous approvals and manual bookings cannot bypass one another. Read the scheduling data for the actual affected dates, including recurring shifts, rather than relying on the displayed calendar week.

### Approval and completion

- Every student-created request, including a group request or student duplicate, starts pending. Pending edits remain pending. Teacher-created student sessions are booked directly after the same scheduling checks.
- Approve only a still-pending request, up to and including 15 minutes after its saved start. Preserve the saved duration unless a teacher explicitly edits the times. Do not allow an edit inside approval to bypass the original request's deadline.
- Keep the request in the actionable approvals list until the deadline. Update expiry timers and foreground refresh accordingly. Acknowledging the title notification still does not resolve a request.
- Atomically create the approved shift, remove or resolve the source request, and deny overlapping pending requests for that tutor. Record decision notifications in the same successful operation. Use idempotency so retries cannot create duplicate shifts or notices.
- Prevent pending or denied requests being marked completed. Do not carry a premature completion value into an approval.
- Reset completion, obsolete responses and meeting identifiers when duplicating an event. Student duplicates require approval; teacher-created bookings retain the teacher booking workflow.

### Permissions and changes

- Teachers and admins can assign, approve, edit, move, cancel and mark sessions complete. Correct the Teacher UI, whose approved shifts are currently read-only.
- Tutors retain their own availability management and existing completion actions, with no acceptance step. Limit completion writes to their assigned shifts unless they also have management permissions.
- Students cannot edit approved sessions or cancel them in the app. The recorded no-cancellation rule also requires removing the current Delete action and permission for pending requests; retain pending request edits unless separately restricted.
- Valid participant replacements and ordinary edits preserve approval, creation details, saved times and completion unless deliberately edited. Empty student-session saves fail without changing the saved record. Enforce this on the server for updates, approval and recurring detachment, as well as in the form on save. Keep the original event separate from the changing draft.
- Deleting or shortening general Work or availability does not delete an existing student booking. Recalculate whether coverage was actually lost and notify Michael when an affected booking needs attention. Cancelling a student booking leaves its surrounding Work intact and restores bookability where coverage remains.
- Recurring creation previews conflicting dates and offers creation on the remaining dates. Recheck on commit and represent skipped occurrences explicitly. Detaching a recurring occurrence must atomically create its replacement and exclude the original occurrence.

Keep existing allocation-email and Teams behaviour. Run these follow-ups after the scheduling transaction succeeds, with retry-safe identifiers. A follow-up failure must not imply that approval failed or needs repeating.

Update Firestore rules alongside the server routes so direct client writes cannot bypass the new invariants. Protect notification writes and booking guards, retain restricted student reads, and cover these rules with emulator tests.

Primary areas: `studentRequestApprovals`, `firestoreOperations`, `useApprovalHandlers`, `calendarStrategy`, `EventForm`, `CalendarContent`, `calendarRecurringEvents`, server authentication and `firebase/firestore.rules`.

## 4 Add the agreed in app notices

- Approval and denial notices go to the requesting student; approval also notifies the assigned tutor.
- Availability-loss notices go only to Michael Ienna at `mienna@kings.edu.au` for now.
- Every selected group member receives the approval or denial in the app. Tutor approval notifications stay unchanged.
- Use compact dashboard notices linking to the relevant event. Do not restore the removed header approval link or add a notification bell, acceptance buttons or a separate notifications page.
- Persist notices for their recipients and acknowledge them with one recipient watermark rather than introducing request-by-request read/unread state. Do not reuse that watermark for the existing pending-request title counter.
- Preserve teacher eligibility and the existing preference for pending-request title notifications, including admin accounts that also have the teacher role. Michael remains the default enabled recipient. Booking-decision notices to students and tutors must not depend on this teacher preference.
- Notification acknowledgement never changes approval, attendance or completion.

## 5 Remove obsolete confirmation logic

- Remove `confirmationRequired` and `tutorResponses` from hours eligibility, dashboard reminders, new drafts and active write payloads. Existing stored fields may remain but must have no effect.
- Remove unused acceptance handlers and misleading confirmation copy. Distinguish student-request approval from the obsolete tutor/student acceptance mechanism.
- Remove obsolete minimum-student response controls where they only serve that acceptance mechanism. Group size does not create an acceptance or attendance threshold.
- Keep completion independent: only the saved completed status determines whether work contributes paid time, together with required student approval.
- Replace tests that expect unconfirmed completed work to be excluded with tests proving legacy confirmation fields are ignored.
- Review Coaching regression fixtures before deleting shared UI or fields so no active coaching workflow is removed accidentally.

## 6 Share one hours calculation

Create a pure calculation module used by the summary, completed-hours dashboard and both CSV and Word exports. It returns exact counted duration, deductions, paid duration, underlying dates and warning reasons. Use integer duration units internally rather than accumulating rounded decimal hours. Scheduled or allocated dashboard figures remain clearly separate from completed paid hours.

### Counting time

1. Keep only completed work; student-created sessions must also be approved. Tutor acceptance is irrelevant.
2. Use saved start and end times. Approval time does not shorten the session.
3. Separate tutors, actual Sydney calendar dates, and Work versus Coaching.
4. For each tutor's Work, count overlapping completed intervals once. An uncompleted surrounding Work event must not contribute time or enlarge the completed session's break group.
5. Apply the agreed break grouping below, then sum paid staff hours for department totals.

A completed student session contributes its own time if surrounding Work is uncompleted, and vice versa. If both are completed, shared time counts once. A standalone session with no teaching contributes nothing; completed surrounding Work still counts when a student does not attend. Partial attendance within a group does not reduce the tutor's hours.

### Break rules

| Duration before deduction | Deduction |
| --- | --- |
| Up to and including 3 hours | None |
| Over 3 through 6 hours | 30 minutes |
| Over 6 hours | 1 hour |

- A single student session follows these thresholds, just like general Work.
- Combine overlapping general Work and its overlapping student sessions without double counting time. Combine the settled back-to-back cases: Work plus Work, or Work plus a student session in either order.
- Keep adjacent student sessions separate for breaks when no surrounding Work joins them. Each individually long student session still receives its own deduction.
- Separate shifts receive separate deductions. An unpaid gap between them is excluded from working time and does not provide either shift with break credit.
- An unpaid break explicitly belonging inside one shift counts towards its required deduction once. For the agreed 9 am to 3:15 pm example, the total deduction is one hour and paid time is 5 hours 15 minutes, including the already identified 30-minute break.
- Break deductions do not reserve calendar time or block bookings. There are no paid rest breaks.
- Never combine different dates or Work with Coaching. Preserve Coaching scheduling and its separate reporting category; do not silently apply Work-specific overlap or grouping exceptions to it.

**Teacher-managed complex cases:** do not build automatic grouping for every unusual mixed sequence or invent a gap threshold. The teacher resolves these cases by recording one general Work shift covering the intended working period. Keep the student bookings so their participants, approvals and occupied times remain accurate; their overlapping time is not paid twice. Once the covering Work shift is completed, apply the normal break rule to that combined period. Until corrected, flag the complex entries and allow export for manual correction; any displayed calculation is provisional, not a resolved payment figure. This manual workflow is the agreed resolution, not an outstanding policy decision.

### Warnings

- Work minimum is 3 hours; Coaching minimum is 2 hours. Show warnings without automatic top-ups or export blocks.
- A lone 30-minute student session gets a short-shift warning. Multiple separate sessions bringing the day to at least 3 hours get the complex-case warning for human checking.
- Warn when grouping is uncertain or one timesheet row cannot explain the day accurately. Export start, finish and counted hours for manual correction.
- Formatting must not round duration before calculating breaks or totals. Retain exact hours and minutes in the report details so decimal presentation cannot change payment calculations.

Primary areas: a shared hours module, `TutorHoursSummary`, `DashboardOverview`, dashboard cards and `api/timesheet/route.js`.

## 7 Fix dates and multiweek timesheets

- Group by tutor, category and Sydney date such as `2026-10-12`, never just `Monday`.
- Calculate daily results before mapping them into a weekly template. Different Mondays retain separate dates, rows and break calculations.
- Keep the existing one-week Word template. Produce one Word timesheet per week and category; package a multiweek export as a ZIP of weekly files. A single-week export remains a Word document.
- Honour the selected date range within each week, including partial final weeks. Name the files clearly by tutor, category and week ending.
- Preserve earliest start, latest finish and counted hours for complex days, with visible review warnings. Do not manufacture a continuous paid shift from the displayed start and finish.
- Use the same completed-event and recurring-instance inputs as the summary, including detached occurrences and exceptions. Never count both a detached occurrence and its original series instance.
- Keep CSV totals equal to the detailed report and the sum of weekly Word files. Remove minimum-hours rejection from the export endpoint.
- Apply the calculation to all historical dates. Compare representative old and new reports before release and make changed historical totals reviewable.

## 8 Delivery order and verification

Build on the dashboard changes already in progress rather than replacing them. Keep reviewable commits grouped as follows:

1. Shared event classification, rule fixtures and removal of obsolete confirmation behaviour.
2. Shared hours calculation, warnings, date grouping and weekly export packaging.
3. Authoritative scheduling service, safe availability, role permissions and database rules.
4. Simplified forms, selected group participants, approval grace period, recurring clash handling and in-app notices.
5. Browser verification, historical comparison and coordinated release.

Prepare the server and compatible read paths before changing client write permissions. Coordinate the stricter rules and client release so an older open tab receives an actionable refresh message instead of silently losing a write. Use the existing GitHub rules deployment workflow; avoid manual console-only changes. Keep legacy records readable without a destructive backfill or approval reset.

### Required examples

All hours examples below assume completed entries for one tutor unless stated otherwise.

| Case | Expected result |
| --- | --- |
| Work 1 to 3 plus Work 2 to 4 | 3 paid hours |
| Work 3 to 5 plus student session 3:30 to 4 | 2 paid hours |
| Work 3 to 5 plus student session 4:30 to 5:30 | 2.5 hours and a short-shift warning |
| Adjoining 2-hour Work entries | 3.5 paid hours |
| Adjoining 2-hour student sessions | 4 paid hours |
| Adjoining 2-hour Work and 2-hour student session | 3.5 paid hours |
| Student sessions 9 to 11 and 11 to 1, followed by Work 1 to 2 | Flag for teacher review; after the teacher records completed general Work from 9 to 2, count 4.5 paid hours with no duplicate payment for the student bookings |
| Separate 3-hour shifts with a gap | 6 paid hours |
| Separate 4-hour shifts with a gap | 7 paid hours |
| Single 4-hour student session | 3.5 paid hours |
| Single 6-hour shift and single 6.25-hour shift | 5.5 and 5.25 hours respectively |
| Only nested 30-minute session completed | 30 minutes, regardless of uncompleted surrounding Work |
| Two tutors each work 2 hours | 2 each and 4 department staff-hours |
| Three hours on each of two different Mondays | Two dated weekly rows, 3 hours each |
| Legacy completed event with confirmation required but no response | Counts normally |

Run unit tests for classification, interval coverage, grouping, warning reasons, roles, approval expiry and report parity. Run emulator or server integration tests for concurrent approvals and manual bookings, atomic denials, ownership, recipient privacy, failed writes and recurring replacement. Cover approval exactly at the 15-minute boundary and immediately after it. Explicitly test participant removal followed by replacement, rejected empty saves, unchanged records after failed saves, and rejection of general Work becoming a student session through participant edits.

Browser checks cover tutor availability with no type selector; booking during Work; a tutor busy with another student's approved session; named group members; teacher creation, editing and completion; warning-only exports; actual multiweek downloads; and acknowledgement in two tabs. Include approval/denial notices, Michael's availability warning, no-show behaviour and cancellation restoring free time. Compare one complex completed-hours example across the real dashboard, summary, CSV download and Word export; verify short Coaching still exports.

Run lint and the production build. Keep existing Teams, allocation-email, subject eligibility, Coaching, role switching and pending-title notification regression checks. Verify that complex cases clearly request teacher review and remain exportable for manual correction.
