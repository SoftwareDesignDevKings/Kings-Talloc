import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc } from 'firebase/firestore';
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