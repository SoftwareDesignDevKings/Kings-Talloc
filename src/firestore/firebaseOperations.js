import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc, writeBatch, getDoc } from 'firebase/firestore';
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
 * Deletes all recurring instances of an event from Firestore
 * @param {string} originalEventId - The ID of the original recurring event
 * @param {Array} allEvents - Array of all events to find recurring instances
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<number>} Number of events deleted
 */
export const deleteAllRecurringInstances = async (originalEventId, allEvents, collectionName = 'events') => {
	console.log('[deleteAllRecurringInstances] Deleting original event:', originalEventId);

	// First, delete the original event (this is the most important one)
	try {
		await deleteEventFromFirestore(originalEventId, collectionName);
		console.log('[deleteAllRecurringInstances] Original event deleted successfully');
	} catch (error) {
		console.error('[deleteAllRecurringInstances] Failed to delete original event:', error);
		throw error;
	}

	let deletedCount = 1;

	// Find all persisted instances of this recurring event (instances that have been saved to Firestore)
	const persistedInstances = allEvents.filter(event =>
		event.originalEventId === originalEventId && event.isRecurringInstance
	);

	console.log('[deleteAllRecurringInstances] Found', persistedInstances.length, 'persisted instances to delete');

	if (persistedInstances.length === 0) {
		return deletedCount;
	}

	// Delete persisted instances in batches
	const BATCH_SIZE = 500;

	for (let i = 0; i < persistedInstances.length; i += BATCH_SIZE) {
		const batch = writeBatch(db);
		const batchEvents = persistedInstances.slice(i, i + BATCH_SIZE);

		for (const event of batchEvents) {
			const eventDocRef = doc(db, collectionName, event.id);
			batch.delete(eventDocRef);
		}

		try {
			await batch.commit();
			deletedCount += batchEvents.length;
			console.log('[deleteAllRecurringInstances] Deleted batch of', batchEvents.length, 'instances');
		} catch (error) {
			console.error('[deleteAllRecurringInstances] Failed to delete batch:', error);
		}
	}

	console.log('[deleteAllRecurringInstances] Total deleted:', deletedCount);
	return deletedCount;
};

/**
 * Adds an exception to a recurring event (marks a specific occurrence as deleted)
 * @param {string} originalEventId - The ID of the original recurring event
 * @param {number} occurrenceIndex - The index of the occurrence to delete
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const addEventException = async (originalEventId, occurrenceIndex, collectionName = 'events') => {
	const eventDocRef = doc(db, collectionName, originalEventId);

	// Get current exceptions array or initialize empty
	const eventDoc = await getDoc(eventDocRef);
	const currentExceptions = eventDoc.exists() ? (eventDoc.data().eventExceptions || []) : [];

	// Add new exception if not already present
	if (!currentExceptions.includes(occurrenceIndex)) {
		await updateDoc(eventDocRef, {
			eventExceptions: [...currentExceptions, occurrenceIndex]
		});
	}
};

/**
 * Sets the 'until' date for a recurring event to stop future occurrences
 * @param {string} originalEventId - The ID of the original recurring event
 * @param {Date} untilDate - The date until which the event should recur
 * @param {string} [collectionName='events'] - The Firestore collection name
 * @returns {Promise<void>}
 */
export const setRecurringUntilDate = async (originalEventId, untilDate, collectionName = 'events') => {
	const eventDocRef = doc(db, collectionName, originalEventId);
	await updateDoc(eventDocRef, {
		until: untilDate
	});
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