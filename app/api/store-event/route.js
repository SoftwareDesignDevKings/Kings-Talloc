import { db } from '../../firebase'; // Adjust the path as necessary
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request) {
  const event = await request.json();

  try {
    await addDoc(collection(db, 'eventsQueue'), {
      ...event,
      timestamp: new Date(), // Ensure the timestamp is added here
    });
    console.log('Event stored:', event); // Debugging line
    return new Response(JSON.stringify({ message: 'Event stored successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error storing event:', error);
    return new Response(JSON.stringify({ message: 'Failed to store event', error }), { status: 500 });
  }
}

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, 'eventsQueue'));
    const eventsQueue = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify(eventsQueue), { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch events', error }), { status: 500 });
  }
}
