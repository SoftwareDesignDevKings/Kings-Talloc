import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore';

/**
 * Adds or updates an event in the email events queue
 * @param {Object} event - The event object containing event details and id
 * @param {string} action - The action being performed (e.g., 'add', 'update')
 * @returns {Promise<{message: string}>} Success message
 * @throws {Error} If operation fails
 */
export const addOrUpdateEventInQueue = async (event, action) => {
	try {
		const eventDoc = doc(db, 'emailEventsQueue', event.id);
		await setDoc(eventDoc, {
			...event,
			timestamp: new Date(),
		});
		return { message: `Event ${action}d successfully in email queue` };
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
 * Persists expanded recurring event instances to Firestore in batch
 * Only persists events that have already started and haven't been persisted yet
 * @param {Array} expandedEvents - Array of expanded event instances to persist
 * @param {Array} existingEventIds - Array of existing event IDs from Firestore to avoid duplicates
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<number>} Number of events persisted
 */
export const persistRecurringInstances = async (expandedEvents, existingEventIds = [], collectionName = 'events') => {
	const now = new Date();
	const existingIdSet = new Set(existingEventIds);

	// Only persist recurring instances that have already started and don't exist in Firestore
	const recurringInstances = expandedEvents.filter(event => event.isRecurringInstance && event.start <= now && !existingIdSet.has(event.id));

	if (recurringInstances.length === 0) {
		return 0;
	}

	// Firestore batch limit is 500 operations
	const BATCH_SIZE = 500;
	let persistedCount = 0;

	for (let i = 0; i < recurringInstances.length; i += BATCH_SIZE) {
		const batch = writeBatch(db);
		const batchEvents = recurringInstances.slice(i, i + BATCH_SIZE);

		for (const event of batchEvents) {
			// Remove metadata fields before persisting
			const { isRecurringInstance, originalEventId, occurrenceIndex, ...eventData } = event;

			// Use the generated ID as the document ID
			const eventDocRef = doc(db, collectionName, event.id);
			batch.set(eventDocRef, {
				...eventData,
				isRecurringInstance: true,
				originalEventId,
				occurrenceIndex
			});
		}

		await batch.commit();
		persistedCount += batchEvents.length;
	}

	return persistedCount;
};