import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient';

/**
 * Adds or updates an event in the email events queue
 * Only sends notifications when event times change
 * @param {Object} event - The event object containing event details and id
 * @param {string} action - The action being performed (e.g., 'store', 'update')
 * @param {Object} originalEvent - The original event data (for updates)
 * @returns {Promise<{message: string}>} Success message
 * @throws {Error} If operation fails
 */
export const addOrUpdateEventInQueue = async (event, action, originalEvent = null) => {
    try {
        // For new events, always send notification
        if (action === 'store') {
            const eventDoc = doc(db, 'emailEventsQueue', event.id);
            await setDoc(eventDoc, {
                ...event,
                timestamp: new Date(),
            });
            return { message: `Event ${action}d successfully in email queue` };
        }

        // For updates, only send notification if times changed
        if (action === 'update' && originalEvent) {
            const originalStart = originalEvent.start instanceof Date
                ? originalEvent.start
                : new Date(originalEvent.start);
            const originalEnd = originalEvent.end instanceof Date
                ? originalEvent.end
                : new Date(originalEvent.end);
            const newStart = event.start instanceof Date
                ? event.start
                : new Date(event.start);
            const newEnd = event.end instanceof Date
                ? event.end
                : new Date(event.end);

            const timesChanged =
                originalStart.getTime() !== newStart.getTime() ||
                originalEnd.getTime() !== newEnd.getTime();

            if (timesChanged) {
                const eventDoc = doc(db, 'emailEventsQueue', event.id);
                await setDoc(eventDoc, {
                    ...event,
                    timestamp: new Date(),
                });
                return { message: `Event ${action}d successfully in email queue (times changed)` };
            } else {
                return { message: `Event ${action}d but no notification sent (times unchanged)` };
            }
        }

        return { message: `Event ${action}d but no notification sent` };
    } catch (error) {
        console.error(`Error during ${action} event in email queue:`, error);
        throw new Error(`Failed to ${action} event in email queue`);
    }
};

/**
 * Removes an event from the email events queue
 * @param {string} id - The ID of the event to remove
 * @returns {Promise<{message: string}>} Success message
 * @throws {Error} If removal fails
 */
export const removeEventFromQueue = async (id) => {
    try {
        const eventDoc = doc(db, 'emailEventsQueue', id);
        await deleteDoc(eventDoc);
        return { message: 'Event removed successfully from email queue' };
    } catch (error) {
        console.error('Error removing event from email queue:', error);
        throw new Error('Failed to remove event from email queue');
    }
};

/**
 * Updates an event in Firestore
 * @param {string} eventId - The ID of the event to update
 * @param {Object} eventData - The updated event data
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const updateEventInFirestore = async (eventId, eventData, collectionName = 'events') => {
    const eventDoc = doc(db, collectionName, eventId);
    await updateDoc(eventDoc, eventData);
};

/**
 * Creates a new event in Firestore
 * @param {Object} eventData - The event data to create
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<string>} The ID of the created document
 */
export const createEventInFirestore = async (eventData, collectionName = 'events') => {
    const docRef = await addDoc(collection(db, collectionName), eventData);
    return docRef.id;
};

/**
 * Deletes an event from Firestore
 * @param {string} eventId - The ID of the event to delete
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const deleteEventFromFirestore = async (eventId, collectionName = 'events') => {
    await deleteDoc(doc(db, collectionName, eventId));
};

/**
 * Adds an exception to a recurring event (marks a specific occurrence as deleted)
 * @param {string} recurringEventId - The ID of the recurring event
 * @param {number} occurrenceIndex - The index of the occurrence to delete
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const addEventException = async (
    recurringEventId,
    occurrenceIndex,
    collectionName = 'events',
) => {
    const eventDocRef = doc(db, collectionName, recurringEventId);

    // Get current exceptions array or initialize empty
    const eventDoc = await getDoc(eventDocRef);
    const currentExceptions = eventDoc.exists() ? eventDoc.data().eventExceptions || [] : [];

    // Add new exception if not already present
    if (!currentExceptions.includes(occurrenceIndex)) {
        await updateDoc(eventDocRef, {
            eventExceptions: [...currentExceptions, occurrenceIndex],
        });
    }
};

/**
 * Sets the 'until' date for a recurring event to stop future occurrences
 * @param {string} recurringEventId - The ID of the recurring event
 * @param {Date} untilDate - The date until which the event should recur
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const setRecurringUntilDate = async (
    recurringEventId,
    untilDate,
    collectionName = 'events',
) => {
    const eventDocRef = doc(db, collectionName, recurringEventId);
    await updateDoc(eventDocRef, {
        until: untilDate,
    });
};
