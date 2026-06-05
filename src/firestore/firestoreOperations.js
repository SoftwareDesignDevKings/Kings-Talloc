import { doc, updateDoc, addDoc, deleteDoc, getDoc, collection, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient';

const isPlainObject = (value) => {
    if (value === null || Object.prototype.toString.call(value) !== '[object Object]') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

export const stripUndefinedFields = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value
            .map(stripUndefinedFields)
            .filter((item) => item !== undefined);
    }

    if (!isPlainObject(value)) {
        return value;
    }

    const cleaned = {};
    for (const [key, fieldValue] of Object.entries(value)) {
        const cleanedValue = stripUndefinedFields(fieldValue);
        if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
        }
    }

    return cleaned;
};
/**
 * Queue an email notification for a shift allocation or time change.
 * Uses shiftId as doc ID so rapid edits collapse into one notification.
 *
 * action='allocated' — new shift or student request approved
 * action='moved'     — existing shift times changed
 *
 * Dedup logic for 'moved':
 *   - if existing doc is 'allocated' (tutor never saw it), update times and keep 'allocated'
 *   - otherwise write/overwrite as 'moved' with previousStart/End from originalEvent
 */
export const queueEmailNotification = async (event, action, createdByEmail, originalEvent = null) => {
    if (!createdByEmail) return;
    if (event.title?.includes('(TESTING)')) return;
    if (!event.id) return;

    const notifDoc = doc(db, 'emailNotifications', event.id);

    if (action === 'allocated') {
        await setDoc(notifDoc, {
            shiftId: event.id,
            action: 'allocated',
            title: event.title,
            start: event.start,
            end: event.end,
            staff: event.staff || [],
            createdByEmail,
            timestamp: new Date(),
        });
        return;
    }

    if (action === 'moved' && originalEvent) {
        const origStart = originalEvent.start instanceof Date ? originalEvent.start : new Date(originalEvent.start);
        const origEnd = originalEvent.end instanceof Date ? originalEvent.end : new Date(originalEvent.end);
        const newStart = event.start instanceof Date ? event.start : new Date(event.start);
        const newEnd = event.end instanceof Date ? event.end : new Date(event.end);

        const timesChanged = origStart.getTime() !== newStart.getTime() || origEnd.getTime() !== newEnd.getTime();
        if (!timesChanged) return;

        const existing = await getDoc(notifDoc);
        if (existing.exists() && existing.data().action === 'allocated') {
            // tutor was never told the old time — just update the allocated notification
            await setDoc(notifDoc, {
                shiftId: event.id,
                action: 'allocated',
                title: event.title,
                start: event.start,
                end: event.end,
                staff: event.staff || [],
                createdByEmail,
                timestamp: new Date(),
            });
        } else {
            await setDoc(notifDoc, {
                shiftId: event.id,
                action: 'moved',
                title: event.title,
                start: event.start,
                end: event.end,
                previousStart: origStart,
                previousEnd: origEnd,
                staff: event.staff || [],
                createdByEmail,
                timestamp: new Date(),
            });
        }
    }
};

/**
 * Remove a pending notification for a shift (called on shift delete to avoid
 * sending an allocated/moved email for something that no longer exists).
 */
export const removeEmailNotification = async (shiftId) => {
    if (!shiftId) return;
    try {
        await deleteDoc(doc(db, 'emailNotifications', shiftId));
    } catch {
        // doc may not exist — not an error
    }
};

/**
 * Updates only the workStatus field of a shift — used by tutors/coaches who lack
 * permission to touch any other field (Firestore rule: hasOnly(['workStatus'])).
 */
export const updateWorkStatusInFirestore = async (shiftId, workStatus) => {
    const shiftDoc = doc(db, 'shifts', shiftId);
    await updateDoc(shiftDoc, { workStatus });
};

/**
 * Updates an event in Firestore
 * @param {string} eventId - The ID of the event to update
 * @param {Object} eventData - The updated event data
 * @param {string} [collectionName='shifts'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const updateEventInFirestore = async (eventId, eventData, collectionName = 'shifts') => {
    const eventDoc = doc(db, collectionName, eventId);
    const firestoreData = { ...eventData };

    // Rebuild emailsList if staff or students are being updated
    if (firestoreData.staff !== undefined || firestoreData.students !== undefined) {
        const staffEmails = (firestoreData.staff || []).map(s => typeof s === 'object' ? s.value : s);
        const studentEmails = (firestoreData.students || []).map(s => typeof s === 'object' ? s.value : s);
        firestoreData.staffEmails = staffEmails;
        firestoreData.studentEmails = studentEmails;
        firestoreData.emailsList = [...new Set([...staffEmails, ...studentEmails])];
    }

    await updateDoc(eventDoc, stripUndefinedFields(firestoreData));
};

/**
 * Creates a new event in Firestore
 * @param {Object} eventData - The event data to create
 * @param {string} [collectionName='shifts'] - The Firestore collection name
 * @returns {Promise<string>} The ID of the created document
 */
export const createEventInFirestore = async (eventData, collectionName = 'shifts') => {
    const staffEmails = (eventData.staff || []).map(s => typeof s === 'object' ? s.value : s);
    const studentEmails = (eventData.students || []).map(s => typeof s === 'object' ? s.value : s);
    const emailsList = [...new Set([...staffEmails, ...studentEmails])];

    const docRef = await addDoc(collection(db, collectionName), stripUndefinedFields({
        ...eventData,
        staffEmails,
        studentEmails,
        emailsList,
    }));
    return docRef.id;
};

/**
 * Deletes an event from Firestore
 * @param {string} eventId - The ID of the event to delete
 * @param {string} [collectionName='shifts'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const deleteEventFromFirestore = async (eventId, collectionName = 'shifts') => {
    await deleteDoc(doc(db, collectionName, eventId));
};

/**
 * Adds an exception to a recurring event (marks a specific occurrence as deleted)
 * @param {string} recurringEventId - The ID of the recurring event
 * @param {number} occurrenceIndex - The index of the occurrence to delete
 * @param {string} [collectionName='shifts'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const addEventException = async (recurringEventId, occurrenceIndex, collectionName = 'shifts') => {
    const eventDocRef = doc(db, collectionName, recurringEventId);

    // firestore arrayUnion handles race-condition and duplicates automatically
    await updateDoc(eventDocRef, {
        eventExceptions: arrayUnion(occurrenceIndex)
    });
};

/**
 * Sets the 'until' date for a recurring event to stop future occurrences
 * @param {string} recurringEventId - The ID of the recurring event
 * @param {Date} untilDate - The date until which the event should recur
 * @param {string} [collectionName='shifts'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const setRecurringUntilDate = async (recurringEventId, untilDate, collectionName = 'shifts') => {
    const eventDocRef = doc(db, collectionName, recurringEventId);
    await updateDoc(eventDocRef, {
        until: untilDate,
    });
};
