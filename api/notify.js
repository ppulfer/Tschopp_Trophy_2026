import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    const since = sinceParam ? parseInt(sinceParam, 10) : Date.now() - 600000; // 10 minutes

    let events = [];
    try {
      console.log('NOTIFY_START', { since });

      // Get all event keys matching pattern
      const allKeys = await kv.keys('event:*');
      console.log('FOUND_KEYS', { count: allKeys?.length || 0 });

      if (allKeys && allKeys.length > 0) {
        // Get all events
        const eventValues = await Promise.all(
          allKeys.map(key => kv.get(key))
        );

        events = eventValues
          .map((value, idx) => {
            try {
              // Value is already parsed by Vercel KV
              const event = typeof value === 'string' ? JSON.parse(value) : value;
              // Only return events newer than 'since'
              return event.timestamp >= since ? event : null;
            } catch (e) {
              console.error('PARSE_ERROR', { key: allKeys[idx], error: e.message });
              return null;
            }
          })
          .filter(Boolean)
          .sort((a, b) => b.timestamp - a.timestamp); // Newest first

        console.log('PARSED_EVENTS', { total: events.length, since });
      }
    } catch (kvError) {
      console.error('KV_ERROR', kvError.message);
    }

    // Always return valid response
    const response = { events: events || [], timestamp: Date.now() };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Notify handler error:', error);
    // Return empty events on error instead of 500
    return new Response(JSON.stringify({ events: [], timestamp: Date.now() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
