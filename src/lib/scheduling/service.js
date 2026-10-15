import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { asDate, emailOf, staffEmails, isApproved, isGeneralWork, isStudentSession, workCategory, canApproveAt, commitmentsConflict, expandRecurringEvents, bookableIntervals, rangeCovered, APPROVAL_GRACE_MS } from './eventRules';
import { documentEvent, readSchedule } from './readSchedule';

export class SchedulingError extends Error {
    constructor(message, status = 400, details = {}) { super(message); this.status = status; this.details = details; }
}
const fail = (condition, message, status = 400, details) => { if (condition) throw new SchedulingError(message, status, details); };
const rolesFor = user => new Set([user.defaultRole || user.role, ...(user.userRoles || [])]);
const manage = roles => roles.has('admin') || roles.has('teacher');
const allowedCollections = new Set(['shifts', 'studentEventRequests', 'tutorAvailabilities']);
const allowedFields = new Set(['title', 'description', 'start', 'end', 'staff', 'students', 'additionalStudents', 'classes', 'subject', 'preference', 'createdByStudent', 'approvalStatus', 'workStatus', 'workType', 'locationType', 'recurring', 'occurenceNum', 'until', 'createTeamsMeeting', 'teamsEventId', 'teamsMeetingUrl', 'teamsJoinUrl', 'onlineMeetingId', 'tutor', 'eventExceptions', 'recordAutomatically']);
const cleanData = data => Object.fromEntries(Object.entries(data || {}).filter(([key, value]) => allowedFields.has(key) && value !== undefined));
const participant = value => { const email = emailOf(value); fail(!email.includes('@') || email.includes('/'), 'Invalid participant.'); return { value: email, label: String(value?.label || email).slice(0, 200) }; };
const flatten = event => {
    const staff = (event.staff || []).map(participant), students = (event.students || []).map(participant);
    const staffList = staff.map(emailOf), studentList = students.map(emailOf);
    return { ...event, staff, students, staffEmails: staffList, studentEmails: studentList, emailsList: [...new Set([...staffList, ...studentList])] };
};
const expand = event => expandRecurringEvents([event], { rangeStart: event.start, rangeEnd: new Date(+event.start + 367 * 86400000), maxOccurrences: 52 });
const notice = (transaction, db, id, recipientEmail, event, kind, message, now) => {
    transaction.set(db.collection('bookingNotifications').doc(encodeURIComponent(`${id}|${kind}|${recipientEmail}`)), {
        recipientEmail, eventId: event.id, start: event.start, end: event.end, title: event.title || 'Tutoring', kind, message, createdAt: now,
    });
};
const decisionNotices = (transaction, db, id, event, approved, now) => {
    for (const student of event.students || []) notice(transaction, db, id, emailOf(student), event, approved ? 'approved' : 'denied', approved ? 'Your tutoring request was approved.' : 'Your tutoring request was denied.', now);
    if (approved) for (const email of staffEmails(event)) notice(transaction, db, id, email, event, 'assigned', 'A student session has been assigned to you.', now);
};

/** All calendar mutations share transactional reads and one guard per affected tutor. */
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
        const saved = snapshot?.exists ? documentEvent(snapshot) : null;
        const raw = cleanData(input.data);
        let event = { ...(saved || {}), ...raw, id: target.id };
        const originalCollection = ['approve', 'deny'].includes(action) ? 'studentEventRequests' : collectionName;
        const owner = saved && ((saved.studentEmails || (saved.students || []).map(emailOf)).includes(actor));
        const ownAvailability = emailOf(saved?.tutor || raw.tutor) === actor;
        const isAvailability = collectionName === 'tutorAvailabilities';
        if (originalCollection === 'studentEventRequests') event.workType = 'work';
        if (!isAvailability) delete event.tutor;
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
            if (!isAvailability) event.workStatus = 'notCompleted';
        }
        if (saved) event.createdAt = saved.createdAt || null;
        let previousScheduling = saved;
        if (action === 'detach') {
            fail(!saved.recurring || !Number.isInteger(input.occurrenceIndex) || input.occurrenceIndex < 0 || (saved.eventExceptions || []).includes(input.occurrenceIndex), 'This recurring occurrence is no longer available.', 409);
            const occurrence = expand(saved).find(item => item.occurrenceIndex === input.occurrenceIndex);
            fail(!occurrence, 'Invalid recurring occurrence.');
            previousScheduling = occurrence;
            event = { ...event, start: raw.start || occurrence.start, end: raw.end || occurrence.end, recurring: null, until: null, occurenceNum: null, eventExceptions: [], createdAt: saved.createdAt || timestamp };
            // A detached occurrence keeps its existing Teams series identifiers for follow-up updates.
        }
        const deletes = action === 'delete';
        const statusOnly = action === 'complete';
        if (!deletes && !['deny', 'exception', 'until'].includes(action)) {
            event.start = asDate(event.start); event.end = asDate(event.end);
            fail(!Number.isFinite(+event.start) || !Number.isFinite(+event.end) || event.end <= event.start, 'Choose a valid start and finish.');
            fail(event.end - event.start > 24 * 3600000, 'Sessions must be shorter than one day.');
            if (event.until) event.until = asDate(event.until);
            if (event.recurring) {
                fail(!['weekly', 'fortnightly'].includes(event.recurring), 'Invalid recurrence.');
                const max = event.recurring === 'weekly' ? 10 : 5;
                const count = Number(event.occurenceNum) || (saved?.recurring ? 52 : 0);
                fail(!Number.isInteger(count) || count < 2 || (count > max && !saved?.recurring), `Choose 2 to ${max} occurrences.`);
                event.occurenceNum = count;
                fail(event.workStatus === 'completed', 'Complete individual recurring occurrences.');
            }
            if (isAvailability) {
                event.tutor = actor;
                if (!saved && roles.has('coach') && !roles.has('tutor')) event.workType = ['coaching'];
                else event.workType = saved?.workType || event.workType || ['work'];
            } else {
                event = flatten(event);
                event.workType = workCategory(event);
                event.recurring = event.recurring || null;
                event.until = event.until || null;
                fail(!event.staff.length, 'Assign at least one staff member.');
                const names = Array.isArray(event.additionalStudents) ? event.additionalStudents : typeof event.additionalStudents === 'string' ? event.additionalStudents.split(/[,\n]/) : [];
                event.additionalStudents = names.map(name => String(name).trim().slice(0, 200)).filter(Boolean).slice(0, 30);
                if (isStudentSession(event)) fail(event.staff.length !== 1, 'Student sessions have one tutor.');
            }
            if (originalCollection === 'studentEventRequests' && !['approve', 'deny'].includes(action)) {
                fail(saved && saved.approvalStatus !== 'pending', 'This request has already been handled.', 409);
                event.approvalStatus = 'pending'; event.workStatus = 'notCompleted'; event.createdByStudent = true;
                if (!manager) {
                    event.students = [{ value: actor, label: sessionUser.name || actor }]; event.classes = []; event.recurring = null;
                    event.createTeamsMeeting = false; event.teamsEventId = null; event.teamsJoinUrl = null;
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
        const guardRefs = emails.map(email => db.collection('tutorBookingGuards').doc(encodeURIComponent(email)));
        const guards = await Promise.all(guardRefs.map(ref => transaction.get(ref)));
        const rangeStart = new Date(Math.min(+(saved?.start || event.start), +event.start));
        const rangeEnd = new Date(Math.max(+(saved?.end || event.end), +event.end) + ((saved?.recurring || event.recurring) ? 367 * 86400000 : 0));
        fail(!Number.isFinite(+rangeStart) || !Number.isFinite(+rangeEnd), 'Invalid event time.');
        const [shifts, availabilitySnapshot, pendingSnapshot, staffSnapshots] = await Promise.all([
            readSchedule(db, rangeStart, rangeEnd, transaction),
            transaction.get(db.collection('tutorAvailabilities').where('end', '>', rangeStart)),
            transaction.get(db.collection('studentEventRequests').where('approvalStatus', '==', 'pending')),
            Promise.all(emails.map(email => transaction.get(db.collection('users').doc(email)))),
        ]);
        const availabilities = availabilitySnapshot.docs.map(documentEvent);
        const otherShifts = shifts.filter(shift => action === 'detach'
            ? !(shift.recurringEventId === saved?.id && shift.occurrenceIndex === input.occurrenceIndex)
            : !saved || (shift.id !== saved.id && shift.recurringEventId !== saved.id));
        let proposed = !deletes && !['deny', 'exception', 'until'].includes(action) ? expand(event) : [];
        const bookingChanged = !previousScheduling || action === 'approve' || +event.start !== +previousScheduling.start || +event.end !== +previousScheduling.end || JSON.stringify(staffEmails(event)) !== JSON.stringify(staffEmails(previousScheduling)) || JSON.stringify((event.students || []).map(emailOf)) !== JSON.stringify((previousScheduling.students || []).map(emailOf)) || workCategory(previousScheduling) !== event.workType;
        if (!isAvailability && !statusOnly && proposed.length) {
            const requiredRole = event.workType === 'coaching' ? 'coach' : isStudentSession(event) ? 'tutor' : null;
            for (const email of staffEmails(event)) {
                const userDoc = staffSnapshots[emails.indexOf(email)];
                fail(bookingChanged && requiredRole && (!userDoc?.exists || !rolesFor(userDoc.data()).has(requiredRole)), `Assigned staff must have the ${requiredRole} role.`);
            }

            if (isStudentSession(event) && bookingChanged) {
                const eligibilityDocs = await Promise.all((event.students || []).map(student => transaction.get(db.collection('studentTutorEligibility').doc(emailOf(student)))));
                for (const eligibility of eligibilityDocs) fail(!eligibility.data()?.eligibleTutorEmails?.map(emailOf).includes(staffEmails(event)[0]), 'The tutor is not eligible for this student’s subjects.');
            }
            const clashing = bookingChanged ? proposed.filter(occurrence => otherShifts.some(existing => isApproved(existing) && staffEmails(existing).some(email => staffEmails(event).includes(email)) && commitmentsConflict(occurrence, existing))) : [];
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

        // No reads below this line: all state changes and notifications commit together.
        guardRefs.forEach((ref, index) => transaction.set(ref, { revision: (guards[index].data()?.revision || 0) + 1 }));
        if (deletes || action === 'deny') {
            if (originalCollection === 'studentEventRequests') {
                transaction.update(source, { approvalStatus: 'denied', deniedAt: timestamp });
                decisionNotices(transaction, db, operationId, saved, false, timestamp);
            } else transaction.delete(source);
        } else if (action === 'exception') {
            fail(!saved.recurring || !Number.isInteger(input.occurrenceIndex) || input.occurrenceIndex < 0, 'Invalid recurring occurrence.');
            transaction.update(source, { eventExceptions: FieldValue.arrayUnion(input.occurrenceIndex) });
        } else if (action === 'until') {
            const until = asDate(input.until); fail(!Number.isFinite(+until), 'Invalid recurrence end.');
            transaction.update(source, { until });
        } else if (statusOnly) transaction.update(source, { workStatus: raw.workStatus });
        else {
            const { id: ignoredId, ...data } = cleanStoredEvent(event);
            transaction.set(target, data);
            if (action === 'detach') transaction.update(source, { eventExceptions: FieldValue.arrayUnion(input.occurrenceIndex) });
            if (action === 'approve') {
                transaction.delete(source);
                decisionNotices(transaction, db, operationId, event, true, timestamp);
            } else if (action === 'create' && collectionName === 'shifts' && isStudentSession(event)) {
                for (const email of staffEmails(event)) notice(transaction, db, operationId, email, event, 'assigned', 'A student session has been assigned to you.', timestamp);
            }
            // Any new approved student booking resolves competing pending requests.
            if (collectionName === 'shifts' || action === 'approve') for (const pendingDoc of pendingSnapshot.docs) {
                if (pendingDoc.id === id && action === 'approve') continue;
                const pending = documentEvent(pendingDoc);
                if (proposed.some(occurrence => isApproved(occurrence) && isStudentSession(occurrence) && staffEmails(pending).some(email => staffEmails(occurrence).includes(email)) && commitmentsConflict(occurrence, pending))) {
                    transaction.update(pendingDoc.ref, { approvalStatus: 'denied', deniedAt: timestamp, denialReason: 'Another student session was approved for this time.' });
                    decisionNotices(transaction, db, `${operationId}-${pendingDoc.id}`, pending, false, timestamp);
                }
            }
        }
        // Warn Michael only when a future booking actually loses previously available coverage.
        if (saved && ((isAvailability && action !== 'create') || (collectionName === 'shifts' && isGeneralWork(saved)))) {
            let afterShifts = shifts, afterAvailabilities = availabilities;
            const replacement = ['delete', 'deny'].includes(action) ? [] : action === 'exception' ? expand({ ...saved, eventExceptions: [...(saved.eventExceptions || []), input.occurrenceIndex] }) : action === 'until' ? expand({ ...saved, until: asDate(input.until) }) : proposed;
            if (isAvailability) afterAvailabilities = [...availabilities.filter(item => item.id !== saved.id), ...replacement];
            else afterShifts = [...otherShifts, ...replacement];
            for (const booking of shifts.filter(item => isStudentSession(item) && isApproved(item) && item.start > timestamp)) {
                const email = staffEmails(booking)[0];
                if (!emails.includes(email)) continue;
                // Remove the booking itself from busy intervals when testing its support.
                const withoutBooking = list => list.filter(item => item.id !== booking.id);
                const before = bookableIntervals(email, availabilities, withoutBooking(shifts));
                const after = bookableIntervals(email, afterAvailabilities, withoutBooking(afterShifts));
                if (rangeCovered(booking.start, booking.end, before) && !rangeCovered(booking.start, booking.end, after)) notice(transaction, db, `${operationId}-${booking.id}`, 'mienna@kings.edu.au', booking, 'coverage-lost', 'This student session lost its supporting Work or availability. Please check with the tutor.', timestamp);
            }
        }
        const skipped = event.eventExceptions || [];
        const result = { id: target.id, eventData: serialise(event), skippedDates: expand({ ...event, eventExceptions: [] }).filter(item => skipped.includes(item.occurrenceIndex)).map(item => item.start.toISOString()) };
        transaction.set(operation, { actor, createdAt: timestamp, result });
        return result;
    });
};
const cleanStoredEvent = event => {
    const { id, isRecurringInstance, recurringEventId, occurrenceIndex, entityType, isStudentRequest, originalAvailabilityId, confirmationRequired, tutorResponses, studentResponses, minStudents, ...stored } = event;
    return stored;
};
const serialise = value => JSON.parse(JSON.stringify(value, (_key, item) => item?.toDate ? item.toDate().toISOString() : item));
