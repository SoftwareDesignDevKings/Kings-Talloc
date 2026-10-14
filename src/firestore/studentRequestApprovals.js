import { collection, doc, getDocsFromServer, query, where, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient';
import { stripUndefinedFields } from '@/firestore/firestoreOperations';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { getTutorShiftConflicts, getRecurringSeriesConflicts } from '@/utils/calendarAvailability';
import { addWeeks, format } from 'date-fns';

const asDate = value => value?.toDate ? value.toDate() : new Date(value);
const participantEmail = participant => participant.value || participant.email || participant;

export const fetchApprovalShifts = async (request, firestore = db) => {
    const emails = [...new Set((request.staff || []).map(participantEmail))];
    if (emails.length === 0) return [];
    // Read by session time rather than staffEmails so legacy shifts without flattened emails
    // are checked too. Recurring bases may have their original end date in the past.
    const shiftsRef = collection(firestore, 'shifts');
    const snapshots = await Promise.all([
        getDocsFromServer(query(shiftsRef, where('end', '>', Timestamp.fromDate(request.start)))),
        getDocsFromServer(query(shiftsRef, where('recurring', 'in', ['weekly', 'fortnightly']))),
    ]);
    const shifts = [...new Map(snapshots.flatMap(snapshot => snapshot.docs.map(doc => {
        const data = doc.data();
        return [doc.id, { ...data, id: doc.id, start: asDate(data.start), end: asDate(data.end), until: data.until ? asDate(data.until) : null }];
    }))).values()].filter(shift => shift.staff?.some(participant => emails.includes(participantEmail(participant))));
    const maxDuration = Math.max(0, ...shifts.map(shift => shift.end - shift.start));
    const earliestStart = Math.min(request.start.getTime(), ...shifts.map(shift => shift.start.getTime()));
    return recurringCalendarExpand(shifts, {
        rangeStart: new Date(request.start.getTime() - maxDuration), rangeEnd: request.end,
        // Include future occurrences beyond the calendar's usual expansion limit.
        maxOccurrences: Math.max(52, Math.ceil((request.end - earliestStart) / (7 * 86400000)) + 3),
    });
};

export const approveStudentRequest = async (requestId, firestore = db, changes = {}) => {
    const requestRef = doc(firestore, 'studentEventRequests', requestId);
    const shiftRef = doc(collection(firestore, 'shifts'));
    return runTransaction(firestore, async transaction => {
        const snapshot = await transaction.get(requestRef);
        if (!snapshot.exists() || snapshot.data().approvalStatus !== 'pending') {
            throw new Error('This request has already been handled or removed.');
        }
        const savedRequest = snapshot.data();
        if (asDate(savedRequest.start).getTime() <= Date.now()) throw new Error('This session has already started.');
        // Calendar approvals may include explicit form edits; creation time belongs to the saved request.
        const request = { ...savedRequest, ...changes, createdAt: savedRequest.createdAt };
        const start = asDate(request.start);
        const end = asDate(request.end);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
            throw new Error('This request has an invalid session time.');
        }
        if (start.getTime() <= Date.now()) throw new Error('This session has already started.');
        // Ordinary queries do not register transactional reads. A shared document per tutor
        // makes concurrent approvals retry and recheck the newly committed booking.
        const guardRefs = [...new Set((request.staff || []).map(participantEmail).map(email => email.trim().toLowerCase()))]
            .sort().map(email => doc(firestore, 'tutorBookingGuards', encodeURIComponent(email)));
        const guards = await Promise.all(guardRefs.map(ref => transaction.get(ref)));
        const shifts = await fetchApprovalShifts({ ...request, start, end: request.recurring ? addWeeks(end, 53) : end }, firestore);
        const conflicts = request.recurring
            ? getRecurringSeriesConflicts(request.staff, start, end, request.recurring, request.occurenceNum, shifts)
            : getTutorShiftConflicts(request.staff, start, end, shifts);
        if (conflicts.length > 0) {
            const details = conflicts.map(c => `${c.tutorName} (conflicts with "${c.conflictTitle}" ${format(new Date(c.conflictStart), 'HH:mm')}–${format(new Date(c.conflictEnd), 'HH:mm')})`).join(', ');
            throw new Error(`Scheduling conflict — ${details}`);
        }
        if (start.getTime() <= Date.now()) throw new Error('This session has already started.');
        const staffEmails = (request.staff || []).map(participantEmail);
        const studentEmails = (request.students || []).map(participantEmail);
        const eventData = stripUndefinedFields({
            title: request.title || 'Tutoring', start, end,
            description: request.description || '', students: request.students || [], staff: request.staff || [],
            classes: request.classes || [], subject: request.subject, preference: request.preference,
            createdByStudent: true, approvalStatus: 'approved', approvedAt: new Date(), createdAt: request.createdAt,
            workStatus: request.workStatus || 'notCompleted', workType: request.workType || 'tutoring', createTeamsMeeting: true,
            confirmationRequired: request.confirmationRequired || false,
            tutorResponses: request.tutorResponses || [], studentResponses: request.studentResponses || [],
            minStudents: request.minStudents || 0, locationType: request.locationType || '',
            recurring: request.recurring || null, occurenceNum: request.occurenceNum || null, until: request.until || null,
            staffEmails, studentEmails, emailsList: [...new Set([...staffEmails, ...studentEmails])],
        });
        guardRefs.forEach((ref, index) => transaction.set(ref, { revision: (guards[index].data()?.revision || 0) + 1 }));
        transaction.set(shiftRef, eventData);
        transaction.delete(requestRef);
        return { id: shiftRef.id, eventData };
    });
};

export const resolveStudentRequest = async (requestId, action, firestore = db) => {
    const ref = doc(firestore, 'studentEventRequests', requestId);
    await runTransaction(firestore, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists() || snapshot.data().approvalStatus !== 'pending') {
            throw new Error('This request has already been handled or removed.');
        }
        if (action === 'delete') transaction.delete(ref);
        else transaction.update(ref, { approvalStatus: 'denied', deniedAt: new Date() });
    });
};
