import 'server-only';
import { DateTime } from 'luxon';
import { FieldValue } from 'firebase-admin/firestore';
import { asDate, emailOf, requestOwnerEmail, staffEmails, studentEmails, scheduledEventsConflict, isApproved, isGeneralWork, isStudentSession, workCategory, canApproveAt, expandRecurringEvents, bookableIntervals, rangeCovered, getParticipantEditError, APPROVAL_GRACE_MS, SYDNEY_ZONE } from './eventRules';
import { documentEvent, readSchedule, resolveClassParticipants } from './readSchedule';
import { findUserProfile } from '@/lib/security/userProfiles';
import { isValidSessionFocus, SESSION_TOPICS_MAX_LENGTH } from './sessionFocus';

export class SchedulingError extends Error {
    constructor(message, status = 400, details = {}) { super(message); this.status = status; this.details = details; }
}
const fail = (condition, message, status = 400, details) => { if (condition) throw new SchedulingError(message, status, details); };
const rolesFor = user => new Set([user.defaultRole || user.role, ...(user.userRoles || [])]);
const manage = roles => roles.has('admin') || roles.has('teacher');
const allowedCollections = new Set(['shifts', 'studentEventRequests', 'tutorAvailabilities']);
const allowedFields = new Set(['title', 'description', 'start', 'end', 'staff', 'students', 'additionalStudents', 'classes', 'subject', 'preference', 'sessionTopics', 'createdByStudent', 'approvalStatus', 'workStatus', 'workType', 'locationType', 'recurring', 'occurenceNum', 'until', 'createTeamsMeeting', 'teamsEventId', 'teamsMeetingUrl', 'teamsJoinUrl', 'onlineMeetingId', 'tutor', 'eventExceptions', 'recordAutomatically']);
const cleanData = data => Object.fromEntries(Object.entries(data || {}).filter(([key, value]) => allowedFields.has(key) && value !== undefined));
const participant = value => { const email = emailOf(value); fail(!email.includes('@') || email.includes('/'), 'Invalid participant.'); return { value: email, label: String(value?.label || email).slice(0, 200) }; };
const flatten = event => {
    const unique = values => { const byEmail = new Map(); for (const value of values || []) { const item = participant(value); if (!byEmail.has(item.value)) byEmail.set(item.value, item); } return [...byEmail.values()]; };
    const staff = unique(event.staff), students = unique(event.students);
    const staffList = staff.map(emailOf), studentList = students.map(emailOf);
    return { ...event, staff, students, staffEmails: staffList, studentEmails: studentList, emailsList: [...new Set([...staffList, ...studentList])] };
};
const YEAR = 367 * 86400000;
const expansionEnd = (event, timestamp) => {
    let end = Math.max(+asDate(event.end), +timestamp) + (event.recurring ? YEAR : 1);
    if (event.recurring && event.occurenceNum) end = Math.max(end, +DateTime.fromJSDate(asDate(event.end), { zone: SYDNEY_ZONE })
        .plus({ weeks: (event.occurenceNum - 1) * (event.recurring === 'weekly' ? 1 : 2) }) + 1);
    return new Date(end);
};
const expand = (event, rangeEnd = expansionEnd(event, new Date())) => expandRecurringEvents([event], { rangeStart: event.start, rangeEnd });
const bookingShape = (event, includeRecurrence = true) => JSON.stringify({
    start: +asDate(event.start), end: +asDate(event.end), staff: staffEmails(event).sort(),
    students: (event.students || []).map(emailOf).sort(), names: event.additionalStudents || [],
    classes: (event.classes || []).map(item => item.value || item.id || item).sort(),
    studentSession: isStudentSession(event), category: workCategory(event),
    ...(includeRecurrence && { recurring: event.recurring || null, count: event.occurenceNum || null,
        until: event.until ? +asDate(event.until) : null, exceptions: event.eventExceptions || [] }),
});
const notice = (transaction, db, id, recipientEmail, event, kind, message, now) => {
    transaction.set(db.collection('bookingNotifications').doc(encodeURIComponent(`${id}|${kind}|${recipientEmail}`)), {
        recipientEmail, eventId: event.id, start: event.start, end: event.end, title: event.title || 'Tutoring', kind, message, createdAt: now,
    });
};
const decisionNotices = (transaction, db, id, event, approved, now) => {
    for (const student of event.students || []) notice(transaction, db, id, emailOf(student), event, approved ? 'approved' : 'denied', approved ? 'Your tutoring request was approved.' : 'Your tutoring request was denied.', now);
};

/** Calendar mutations share transactional reads and guards for affected tutors and students. */
export const scheduleMutation = async (db, sessionUser, input, { now = () => new Date() } = {}) => {
    const actor = emailOf(sessionUser.email);
    fail(!actor, 'Unauthorised', 401);
    const roles = rolesFor(sessionUser);
    const manager = manage(roles);
    const { action, id, operationId, allowSkipConflicts = false } = input;
    const collectionName = ['approve', 'deny'].includes(action) ? 'studentEventRequests' : input.collectionName || 'shifts';
    fail(['complete', 'detach', 'exception', 'until'].includes(action) && collectionName !== 'shifts', 'This action is only valid for shifts.');
    fail(!allowedCollections.has(collectionName), 'Invalid calendar collection.');
    fail(id && (typeof id !== 'string' || id.includes('/') || id.length > 500), 'Invalid event ID.');
    fail(!['create', 'update', 'delete', 'complete', 'detach', 'exception', 'until', 'approve', 'deny'].includes(action), 'Invalid calendar action.');
    fail(!operationId || !/^[a-zA-Z0-9_-]{8,100}$/.test(operationId), 'Invalid operation identifier.');
    const target = action === 'approve' ? db.collection('shifts').doc(`approved-${id}`) : action === 'create' || action === 'detach' ? db.collection(collectionName).doc() : db.collection(collectionName).doc(id || '__missing__');
    const source = db.collection(['approve', 'deny'].includes(action) ? 'studentEventRequests' : collectionName).doc(id || '__missing__');
    const operation = db.collection('schedulingOperations').doc(`${encodeURIComponent(actor)}_${operationId}`);

    return db.runTransaction(async transaction => {
        const timestamp = now();
        const operationSnapshot = await transaction.get(operation);
        if (operationSnapshot.exists) return operationSnapshot.data().result;
        const snapshot = action === 'create' ? null : await transaction.get(source);
        fail(action !== 'create' && !snapshot?.exists, 'This event has already been handled or removed.', 409);
        const revision = Number.isInteger(snapshot?.data()?.revision) ? snapshot.data().revision : 0;
        if (input.expectedRevision !== undefined) {
            fail(!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0, 'Invalid event revision.');
            fail(input.expectedRevision !== revision, 'This event changed in another tab. Close it and reopen it before saving.', 409);
        }
        const saved = snapshot?.exists ? await resolveClassParticipants(db, documentEvent(snapshot), transaction) : null;
        const raw = cleanData(input.data);
        if (action !== 'create' && raw.workStatus !== undefined) fail(!['completed', 'notCompleted', 'notAttended'].includes(raw.workStatus), 'Invalid completion status.');
        const classIds = classes => (classes || []).map(item => String(item.value || item.id || item)).sort();
        const classesChanged = raw.classes && JSON.stringify(classIds(raw.classes)) !== JSON.stringify(classIds(saved?.classes));
        let event = { ...(saved || {}), ...raw, id: target.id };
        if (classesChanged) delete event.studentParticipantsResolved;
        const originalCollection = ['approve', 'deny'].includes(action) ? 'studentEventRequests' : collectionName;
        const owner = saved && requestOwnerEmail(saved) === actor;
        const ownAvailability = emailOf(saved?.tutor || raw.tutor) === actor;
        const isAvailability = collectionName === 'tutorAvailabilities';
        if (originalCollection === 'studentEventRequests') event.workType = 'work';
        if (!isAvailability) delete event.tutor;
        // Canonicalise student-owned requests before any structural/eligibility checks.
        if (!manager && originalCollection === 'studentEventRequests' && ['create', 'update'].includes(action)) {
            fail(event.students !== undefined && !Array.isArray(event.students), 'Choose students from the student list.');
            fail((event.students || []).length > 30, 'A group booking can include up to 30 students.');
            event.students = [{ value: actor, label: sessionUser.name || actor }, ...(event.students || []).filter(student => emailOf(student) !== actor)];
            event.students = [...new Map(event.students.map(student => [emailOf(student), student])).values()];
            fail(event.students.length > 30, 'A group booking can include up to 30 students.');
            event.requesterEmail = saved ? requestOwnerEmail(saved) : actor;
            event.classes = []; event.recurring = null; event.occurenceNum = null; event.until = null;
        }
        if (isAvailability) fail(!(roles.has('tutor') || roles.has('coach')) || !ownAvailability || (raw.tutor && emailOf(raw.tutor) !== actor), 'Only the tutor can manage their availability.', 403);
        else if (!manager) {
            if (action === 'complete' || (action === 'detach' && collectionName === 'shifts')) {
                fail(!(roles.has('tutor') || roles.has('coach')) || !saved || !staffEmails(saved).includes(actor), 'You can only complete your own assigned shifts.', 403);
                fail(Object.keys(raw).some(key => key !== 'workStatus'), 'Only completion status can be changed.', 403);
            } else {
                fail(!roles.has('student') || originalCollection !== 'studentEventRequests' || !['create', 'update'].includes(action), 'Only teachers can manage bookings.', 403);
                fail(action !== 'create' && (!owner || saved.approvalStatus !== 'pending'), 'Only your pending request can be edited.', 403);
            }
        }
        if (!manager && originalCollection === 'studentEventRequests' && ['create', 'update'].includes(action)) {
            fail(!isValidSessionFocus(event.preference), 'Select a session focus before submitting your request.');
        }
        if (raw.sessionTopics !== undefined) {
            fail(typeof raw.sessionTopics !== 'string' || raw.sessionTopics.length > SESSION_TOPICS_MAX_LENGTH, `Topics to cover must be text of up to ${SESSION_TOPICS_MAX_LENGTH} characters.`);
            event.sessionTopics = raw.sessionTopics.trim();
        }
        if (action === 'approve' || action === 'deny') {
            fail(!manager, 'Only teachers can decide requests.', 403);
            fail(saved.approvalStatus !== 'pending', 'This request has already been handled.', 409);
            if (action === 'approve') {
                fail(!canApproveAt(saved, +timestamp), 'A request cannot be approved more than 15 minutes after its saved start.', 409);
                event = { ...event, createdByStudent: true, approvalStatus: 'approved', approvedAt: timestamp, workStatus: 'notCompleted', createTeamsMeeting: true };
            }
        }
        if (action === 'complete' || (action === 'detach' && raw.workStatus)) {
            fail(!isApproved(saved), 'A student session must be approved before it can be completed.', 409);
            fail(!['completed', 'notCompleted', 'notAttended'].includes(raw.workStatus), 'Invalid completion status.');
        }
        if (action === 'create') {
            event.createdAt = timestamp;
            if (!isAvailability) {
                event.workStatus = 'notCompleted';
                // A duplicate gets its own meeting after saving; never inherit the original IDs.
                event.teamsEventId = null; event.teamsJoinUrl = null; event.teamsMeetingUrl = null; event.onlineMeetingId = null;
            }
        }
        if (saved) event.createdAt = saved.createdAt || null;
        let previousScheduling = saved;
        if (action === 'detach') {
            fail(!saved.recurring || !Number.isInteger(input.occurrenceIndex) || input.occurrenceIndex < 0 || (saved.eventExceptions || []).includes(input.occurrenceIndex), 'This recurring occurrence is no longer available.', 409);
            const occurrenceEnd = DateTime.fromJSDate(saved.end, { zone: SYDNEY_ZONE })
                .plus({ weeks: input.occurrenceIndex * (saved.recurring === 'weekly' ? 1 : 2) }).plus({ milliseconds: 1 }).toJSDate();
            const occurrence = expand(saved, occurrenceEnd).find(item => item.occurrenceIndex === input.occurrenceIndex);
            fail(!occurrence, 'Invalid recurring occurrence.');
            previousScheduling = occurrence;
            event = { ...event, start: raw.start || occurrence.start, end: raw.end || occurrence.end, recurring: null, until: null, occurenceNum: null, eventExceptions: [], createdAt: saved.createdAt || timestamp };
            // A detached occurrence keeps its existing Teams series identifiers for follow-up updates.
        }
        if (action === 'until') {
            fail(!saved.recurring, 'This event is not recurring.');
            event.until = asDate(input.until);
            fail(!Number.isFinite(+event.until), 'Invalid recurrence end.');
        }
        const deletes = action === 'delete';
        // Old clients treated Delete as rejection. Require the new explicit intent
        // so an already-open old tab cannot silently erase a request after release.
        fail(deletes && originalCollection === 'studentEventRequests' && input.confirmPermanentDelete !== true, 'Refresh the app and confirm permanent deletion of this request.', 409);
        const statusOnly = action === 'complete';
        if (!deletes && !['deny', 'exception'].includes(action)) {
            event.start = asDate(event.start); event.end = asDate(event.end);
            fail(!Number.isFinite(+event.start) || !Number.isFinite(+event.end) || event.end <= event.start, 'Choose a valid start and finish.');
            fail(event.end - event.start > 24 * 3600000, 'Sessions must be shorter than one day.');
            if (event.until) event.until = asDate(event.until);
            if (event.recurring) {
                fail(!['weekly', 'fortnightly'].includes(event.recurring), 'Invalid recurrence.');
                const max = event.recurring === 'weekly' ? 10 : 5;
                const legacyOpenEnded = saved?.recurring && !saved.occurenceNum && !event.occurenceNum;
                const count = Number(event.occurenceNum);
                fail(!legacyOpenEnded && (!Number.isInteger(count) || count < 2 || (count > max && count !== Number(saved?.occurenceNum))), `Choose 2 to ${max} occurrences.`);
                if (!legacyOpenEnded) event.occurenceNum = count;
                fail(event.workStatus === 'completed', 'Complete individual recurring occurrences.');
            }
            if (isAvailability) {
                event.tutor = actor;
                if (!saved && roles.has('coach') && !roles.has('tutor')) event.workType = ['coaching'];
                else event.workType = saved?.workType || event.workType || ['work'];
            } else {
                if (!classesChanged && saved && (saved.students?.length || saved.additionalStudents?.length) && (raw.students !== undefined || raw.additionalStudents !== undefined)) event.studentParticipantsResolved = true;
                event = flatten(await resolveClassParticipants(db, event, transaction));
                event.workType = workCategory(event);
                event.recurring = event.recurring || null;
                event.until = event.until || null;
                fail(!event.staff.length, 'Assign at least one staff member.');
                const names = Array.isArray(event.additionalStudents) ? event.additionalStudents : typeof event.additionalStudents === 'string' ? event.additionalStudents.split(/[,\n]/) : [];
                event.additionalStudents = names.map(name => String(name).trim().slice(0, 200)).filter(Boolean).slice(0, 30);
                // Explicit participant edits must not silently refill names from old class metadata.
                // Class-only legacy records remain occupied until a teacher resolves participants.
                if (event.students.length || event.additionalStudents.length ||
                    (!classesChanged && saved && (saved.students?.length || saved.additionalStudents?.length) && (raw.students !== undefined || raw.additionalStudents !== undefined))) {
                    event.studentParticipantsResolved = true;
                }
                if (['update', 'approve', 'detach'].includes(action) || originalCollection === 'studentEventRequests') {
                    const participantError = getParticipantEditError(saved || (originalCollection === 'studentEventRequests' ? { isStudentRequest: true } : null), event);
                    fail(Boolean(participantError), participantError);
                }
                // Students choose one tutor; managers may organise sessions with several.
                // Completion of an existing assignment never changes its staff.
                if (isStudentSession(event) && !manager && originalCollection === 'studentEventRequests') fail(event.staff.length !== 1, 'Student requests have one tutor.');
            }
            if (originalCollection === 'studentEventRequests' && !['approve', 'deny'].includes(action)) {
                fail(saved && saved.approvalStatus !== 'pending', 'This request has already been handled.', 409);
                event.approvalStatus = 'pending'; event.workStatus = 'notCompleted'; event.createdByStudent = true;
                if (!manager) {
                    event.classes = []; event.recurring = null;
                    event.createTeamsMeeting = false; event.teamsEventId = null; event.teamsJoinUrl = null; event.teamsMeetingUrl = null; event.onlineMeetingId = null;
                    event = flatten(event);
                    fail(event.start <= timestamp, 'Student requests must start in the future.');
                }
            } else if (saved && action !== 'approve') {
                event.createdByStudent = saved.createdByStudent || false;
                event.approvalStatus = saved.approvalStatus || 'approved';
            } else if (action === 'create' && collectionName === 'shifts') {
                event.createdByStudent = false; event.approvalStatus = 'approved';
            }
        }
        if (collectionName === 'shifts' && event.workStatus === 'completed') fail(!isApproved(event), 'A student session must be approved before it can be completed.', 409);
        const emails = [...new Set([...(saved ? staffEmails(saved) : []), ...staffEmails(event), ...(isAvailability ? [actor] : [])])].sort();
        const affectedStudents = [...new Set([...(saved ? studentEmails(saved) : []), ...studentEmails(event)])].sort();
        const guardRefs = [...emails.map(email => encodeURIComponent(email)), ...affectedStudents.map(email => `student:${encodeURIComponent(email)}`)].map(id => db.collection('tutorBookingGuards').doc(id));
        const guards = await Promise.all(guardRefs.map(ref => transaction.get(ref)));
        // Include adjacent support for sessions spanning more than the edited Work record.
        const coverageChange = saved && (isAvailability || (collectionName === 'shifts' && isGeneralWork(saved)));
        const rangeStart = new Date(Math.min(+(saved?.start || event.start), +event.start) - (coverageChange ? 86400000 : 0));
        let rangeEnd = new Date(Math.max(+expansionEnd(saved || event, timestamp), +expansionEnd(event, timestamp)) + (coverageChange ? 86400000 : 0));
        fail(!Number.isFinite(+rangeStart) || !Number.isFinite(+rangeEnd), 'Invalid event time.');
        // Read availability and pending requests only when this change uses them, and
        // only around its dates. Availability and student requests last at most a day,
        // so starts from a day before the range cover everything that can overlap it.
        // Recurring edits keep no upper bound because their range grows below.
        const recurringChange = Boolean(saved?.recurring || event.recurring);
        const coverageWarning = Boolean(saved && ((isAvailability && action !== 'create') || (collectionName === 'shifts' && isGeneralWork(saved))));
        const needsAvailability = coverageWarning || (!manager && originalCollection === 'studentEventRequests');
        const needsPending = recurringChange || collectionName === 'shifts' || action === 'approve';
        const nearRange = query => {
            const bounded = query.where('start', '>=', new Date(+rangeStart - 86400000));
            return recurringChange ? bounded : bounded.where('start', '<', rangeEnd);
        };
        const [shifts, availabilitySnapshot, pendingSnapshot, staffSnapshots, requestNotices] = await Promise.all([
            readSchedule(db, rangeStart, rangeEnd, transaction, { includeFuture: recurringChange }),
            needsAvailability ? transaction.get(nearRange(db.collection('tutorAvailabilities'))) : { docs: [] },
            needsPending ? transaction.get(nearRange(db.collection('studentEventRequests').where('approvalStatus', '==', 'pending'))) : { docs: [] },
            Promise.all(emails.map(email => findUserProfile(db, email, ref => transaction.get(ref)))),
            deletes && originalCollection === 'studentEventRequests'
                ? transaction.get(db.collection('bookingNotifications').where('eventId', '==', id)) : null,
        ]);
        if (saved?.recurring || event.recurring) rangeEnd = new Date(Math.max(+rangeEnd, ...shifts.map(shift => +shift.end + 1), ...pendingSnapshot.docs.map(doc => +asDate(doc.data().end) + 1)));
        const availabilities = availabilitySnapshot.docs.map(documentEvent);
        const otherShifts = shifts.filter(shift => action === 'detach'
            ? !(shift.recurringEventId === saved?.id && shift.occurrenceIndex === input.occurrenceIndex)
            : !saved || (shift.id !== saved.id && shift.recurringEventId !== saved.id));
        let proposed = !deletes && !['deny', 'exception'].includes(action) ? expand(event, rangeEnd) : [];
        const bookingChanged = !previousScheduling || action === 'approve' || bookingShape(event, action !== 'detach') !== bookingShape(previousScheduling, action !== 'detach');
        if (!isAvailability && !statusOnly && proposed.length) {
            const requiredRole = event.workType === 'coaching' ? 'coach' : isStudentSession(event) ? 'tutor' : null;
            for (const email of staffEmails(event)) {
                const userDoc = staffSnapshots[emails.indexOf(email)];
                fail(bookingChanged && userDoc?.data()?.disabled === true, 'Assigned staff account is disabled.', 409);
                fail(bookingChanged && requiredRole && (!userDoc?.exists || !rolesFor(userDoc.data()).has(requiredRole)), `Assigned staff must have the ${requiredRole} role.`);
            }

            if (isStudentSession(event) && bookingChanged) {
                const eligibilityDocs = await Promise.all((event.students || []).map(student => transaction.get(db.collection('studentTutorEligibility').doc(emailOf(student)))));
                for (const eligibility of eligibilityDocs) {
                    const eligible = new Set((eligibility.data()?.eligibleTutorEmails || []).map(emailOf));
                    fail(staffEmails(event).some(email => !eligible.has(email)), 'The tutor is not eligible for this student’s subjects.');
                }
            }
            const previousOccurrences = saved ? expand(saved, rangeEnd) : [];
            const clashing = bookingChanged ? proposed.filter(occurrence =>
                // Trimming a series does not reschedule its surviving occurrences.
                !(action === 'until' && previousOccurrences.some(old => +old.start === +occurrence.start && +old.end === +occurrence.end)) && otherShifts.some(existing => isApproved(existing) && scheduledEventsConflict(occurrence, existing))) : [];
            if (clashing.length) {
                fail(!event.recurring || !allowSkipConflicts, 'Scheduling conflict. Review the conflicting dates.', 409, { conflictingDates: clashing.map(item => item.start.toISOString()), canSkip: Boolean(event.recurring) });
                event.eventExceptions = [...new Set([...(event.eventExceptions || []), ...clashing.map(item => item.occurrenceIndex)])];
                proposed = proposed.filter(item => !clashing.some(clash => clash.occurrenceIndex === item.occurrenceIndex));
                fail(!proposed.length, 'All occurrences conflict; nothing was created.', 409);
            }
            if (!manager && originalCollection === 'studentEventRequests') {
                const free = bookableIntervals(staffEmails(event)[0], availabilities, shifts);
                fail(!rangeCovered(event.start, event.end, free), 'The tutor is no longer available for the full session.', 409);
            }
        }
        if (action === 'approve') fail(+now() > +saved.start + APPROVAL_GRACE_MS, 'The approval deadline has passed.', 409);

        event.revision = action === 'create' || action === 'detach' || action === 'approve' ? 1 : revision + 1;

        // No reads below this line: all state changes and notifications commit together.
        guardRefs.forEach((ref, index) => transaction.set(ref, { revision: (guards[index].data()?.revision || 0) + 1 }));
        if (deletes || action === 'deny') {
            if (action === 'deny') {
                transaction.update(source, { approvalStatus: 'denied', deniedAt: timestamp, revision: revision + 1 });
                decisionNotices(transaction, db, operationId, saved, false, timestamp);
            } else {
                transaction.delete(source);
                requestNotices?.docs.forEach(doc => transaction.delete(doc.ref));
            }
        } else if (action === 'exception') {
            fail(!saved.recurring || !Number.isInteger(input.occurrenceIndex) || input.occurrenceIndex < 0, 'Invalid recurring occurrence.');
            transaction.update(source, { eventExceptions: FieldValue.arrayUnion(input.occurrenceIndex), revision: revision + 1 });
        } else if (action === 'until') {
            transaction.update(source, { until: event.until, eventExceptions: event.eventExceptions || [], revision: revision + 1 });
        } else if (statusOnly) transaction.update(source, { workStatus: raw.workStatus, revision: revision + 1 });
        else {
            const { id: ignoredId, ...data } = cleanStoredEvent(event);
            transaction.set(target, data);
            if (action === 'detach') transaction.update(source, { eventExceptions: FieldValue.arrayUnion(input.occurrenceIndex), revision: revision + 1 });
            if (action === 'approve') {
                transaction.delete(source);
                decisionNotices(transaction, db, operationId, event, true, timestamp);
            }
        }
        // Any new approved student booking resolves competing pending requests.
        if (collectionName === 'shifts' || action === 'approve') for (const pendingDoc of pendingSnapshot.docs) {
            if (pendingDoc.id === id && action === 'approve') continue;
            const pending = documentEvent(pendingDoc);
            if (proposed.some(occurrence => isApproved(occurrence) && isStudentSession(occurrence) && scheduledEventsConflict(occurrence, pending))) {
                transaction.update(pendingDoc.ref, { approvalStatus: 'denied', deniedAt: timestamp, denialReason: 'Another student session was approved for this time.', revision: (Number.isInteger(pending.revision) ? pending.revision : 0) + 1 });
                decisionNotices(transaction, db, `${operationId}-${pendingDoc.id}`, pending, false, timestamp);
            }
        }
        // Warn Michael only when a future booking actually loses previously available coverage.
        if (saved && ((isAvailability && action !== 'create') || (collectionName === 'shifts' && isGeneralWork(saved)))) {
            let afterShifts = shifts, afterAvailabilities = availabilities;
            const replacement = ['delete', 'deny'].includes(action) ? [] : action === 'exception' ? expand({ ...saved, eventExceptions: [...(saved.eventExceptions || []), input.occurrenceIndex] }, rangeEnd) : action === 'until' ? expand({ ...saved, until: event.until }, rangeEnd) : proposed;
            if (isAvailability) afterAvailabilities = [...availabilities.filter(item => item.id !== saved.id), ...replacement];
            else afterShifts = [...otherShifts, ...replacement];
            for (const booking of shifts.filter(item => isStudentSession(item) && isApproved(item) && item.start > timestamp)) {
                const bookingTutors = staffEmails(booking).filter(email => emails.includes(email));
                if (!bookingTutors.length) continue;
                // Remove the booking itself from busy intervals when testing its support.
                const withoutBooking = list => list.filter(item => item.id !== booking.id);
                const lostCoverage = bookingTutors.some(email => {
                    const before = bookableIntervals(email, availabilities, withoutBooking(shifts));
                    const after = bookableIntervals(email, afterAvailabilities, withoutBooking(afterShifts));
                    return rangeCovered(booking.start, booking.end, before) && !rangeCovered(booking.start, booking.end, after);
                });
                if (lostCoverage) notice(transaction, db, `${operationId}-${booking.id}`, 'mienna@kings.edu.au', booking, 'coverage-lost', 'This student session lost its supporting Work or availability. Please check with the tutor.', timestamp);
            }
        }
        const skipped = event.eventExceptions || [];
        const result = { id: target.id, eventData: serialise(event), skippedDates: expand({ ...event, eventExceptions: [] }, rangeEnd).filter(item => skipped.includes(item.occurrenceIndex)).map(item => item.start.toISOString()) };
        transaction.set(operation, { actor, createdAt: timestamp, result });
        return result;
    });
};
const cleanStoredEvent = event => {
    const { id, isRecurringInstance, recurringEventId, occurrenceIndex, entityType, isStudentRequest, originalAvailabilityId, confirmationRequired, tutorResponses, studentResponses, minStudents, ...stored } = event;
    return stored;
};
const serialise = value => JSON.parse(JSON.stringify(value, (_key, item) => item?.toDate ? item.toDate().toISOString() : item));
