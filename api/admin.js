import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'GET') {
    const data = (await kv.hgetall('trip_stats')) || {};
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST') {
    const { action, key, value } = await request.json();

    if (action === 'set') {
      const val = parseInt(value, 10);
      if (isNaN(val) || val < 0) {
        return new Response(JSON.stringify({ error: 'Invalid value' }), { status: 400 });
      }
      await kv.hset('trip_stats', { [key]: val });
      return new Response(JSON.stringify({ ok: true, key, value: val }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      await kv.hdel('trip_stats', key);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add') {
      const val = parseInt(value, 10);
      if (isNaN(val) || val < 0) {
        return new Response(JSON.stringify({ error: 'Invalid value' }), { status: 400 });
      }
      const today = new Date().toISOString().split('T')[0];
      const newKey = `${key}__${today}`;
      await kv.hset('trip_stats', { [newKey]: val });
      return new Response(JSON.stringify({ ok: true, key: newKey, value: val }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
