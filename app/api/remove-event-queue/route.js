import { db } from '../../firebase'; // Adjust the path as necessary
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST(req, res) {
  const { id } = await req.json();

  try {
    const eventDoc = doc(db, 'eventsQueue', id);
    await deleteDoc(eventDoc);
    return new Response(JSON.stringify({ message: 'Event removed from queue' }), { status: 200 });
  } catch (error) {
    console.error('Error removing event from queue:', error);
    return new Response(JSON.stringify({ message: 'Failed to remove event from queue', error }), { status: 500 });
  }
}
