import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const allKeys = await kv.keys('event:*');
    if (!allKeys || allKeys.length === 0) {
      return new Response(JSON.stringify({ ok: true, migrated: 0, message: 'No legacy events found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const values = await Promise.all(allKeys.map(k => kv.get(k)));

    let migrated = 0;
    let skipped = 0;

    for (const value of values) {
      try {
        const event = typeof value === 'string' ? JSON.parse(value) : value;
        if (!event || typeof event.timestamp !== 'number') { skipped++; continue; }
        const member = JSON.stringify(event);
        await kv.zadd('events', { score: event.timestamp, member });
        migrated++;
      } catch (e) {
        skipped++;
      }
    }

    return new Response(JSON.stringify({ ok: true, migrated, skipped, total: allKeys.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
