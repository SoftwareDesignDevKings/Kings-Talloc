import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '@/firestore/db';

export const addOrUpdateEventInQueue = async (event, action) => {
  try {
    const eventDoc = doc(db, 'eventsQueue', event.id);
    await setDoc(eventDoc, {
      ...event,
      timestamp: new Date(),
    });
    return { message: `Event ${action}d successfully in queue` };
  } catch (error) {
    console.error(`Error during ${action} event in queue:`, error);
    throw new Error(`Failed to ${action} event in queue`);
  }
};

export const removeEventFromQueue = async (id) => {
  try {
    const eventDoc = doc(db, 'eventsQueue', id);
    await deleteDoc(eventDoc);
    return { message: 'Event removed successfully from queue' };
  } catch (error) {
    console.error('Error removing event from queue:', error);
    throw new Error('Failed to remove event from queue');
  }
};

export const updateEventInFirestore = async (eventId, eventData, collectionName = 'events') => {
  const eventDoc = doc(db, collectionName, eventId);
  await updateDoc(eventDoc, eventData);
};

export const createEventInFirestore = async (eventData, collectionName = 'events') => {
  const docRef = await addDoc(collection(db, collectionName), eventData);
  return docRef.id;
};

export const deleteEventFromFirestore = async (eventId, collectionName = 'events') => {
  await deleteDoc(doc(db, collectionName, eventId));
};