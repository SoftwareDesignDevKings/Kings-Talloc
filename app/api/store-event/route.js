let eventsQueue = [];

export async function POST(request) {
  const event = await request.json();

  eventsQueue.push(event);

  return new Response(JSON.stringify({ message: 'Event stored successfully' }), { status: 200 });
}

export function getEventsQueue() {
  return eventsQueue;
}

export function clearEventsQueue() {
  eventsQueue = [];
}
