let eventsQueue = [];

export async function POST(request) {
  const event = await request.json();

  eventsQueue.push(event);

  console.log('Event stored:', event); // Add this line for debugging
  console.log('Current eventsQueue:', eventsQueue); // Add this line for debugging

  return new Response(JSON.stringify({ message: 'Event stored successfully' }), { status: 200 });
}

export function getEventsQueue() {
  return eventsQueue;
}

export function clearEventsQueue() {
  eventsQueue = [];
}
