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

      // Get list length first
      const listLength = await kv.llen('game_events_list');
      console.log('LIST_LENGTH', listLength);

      // Get all events from list
      const eventStrings = await kv.lrange('game_events_list', 0, -1);
      console.log('LRANGE_RESULT', { count: eventStrings?.length || 0, sample: eventStrings?.[0] });

      // Parse JSON strings and filter by timestamp
      events = (eventStrings || [])
        .map(str => {
          try {
            const parsed = JSON.parse(str);
            return parsed.timestamp >= since ? parsed : null;
          } catch (e) {
            console.error('PARSE_ERROR', { error: e.message, str });
            return null;
          }
        })
        .filter(Boolean);

      console.log('FILTERED_EVENTS', { count: events.length, since, now: Date.now() });
    } catch (kvError) {
      console.error('KV_ERROR', { message: kvError.message, stack: kvError.stack });
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
