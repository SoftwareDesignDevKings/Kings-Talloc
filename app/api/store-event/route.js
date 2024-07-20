import { db } from '../../firebase'; // Adjust the path as necessary
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function POST(request) {
  const event = await request.json();

  try {
    await addDoc(collection(db, 'eventsQueue'), {
      ...event,
      timestamp: new Date(), // Add a timestamp for ordering
    });
    return new Response(JSON.stringify({ message: 'Event stored successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error storing event:', error);
    return new Response(JSON.stringify({ message: 'Failed to store event', error }), { status: 500 });
  }
}

export async function GET() {
  try {
    const q = query(collection(db, 'eventsQueue'), where('timestamp', '<=', new Date()));
    const querySnapshot = await getDocs(q);
    const eventsQueue = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify(eventsQueue), { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch events', error }), { status: 500 });
  }
}
