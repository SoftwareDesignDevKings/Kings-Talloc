import { db } from '../../firebase'; // Adjust the path as necessary
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req, res) {
  const event = await req.json();

  try {
    const eventDoc = doc(db, 'eventsQueue', event.id);
    await setDoc(eventDoc, event);
    return new Response(JSON.stringify({ message: 'Event updated in queue' }), { status: 200 });
  } catch (error) {
    console.error('Error updating event in queue:', error);
    return new Response(JSON.stringify({ message: 'Failed to update event in queue', error }), { status: 500 });
  }
}
