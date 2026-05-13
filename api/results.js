import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const date = url.searchParams.get('date');
    const all = (await kv.hgetall('trip_results')) || {};
    const parsed = {};
    Object.entries(all).forEach(([k, v]) => {
      parsed[k] = typeof v === 'string' ? JSON.parse(v) : v;
    });
    if (date) {
      const dateResults = {};
      Object.entries(parsed).forEach(([k, v]) => {
        if (k.startsWith(date + '__')) {
          dateResults[parseInt(k.split('__')[1])] = v;
        }
      });
      return new Response(JSON.stringify(dateResults), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST') {
    const { date, flightIdx, holes } = await request.json();
    if (!date || flightIdx === undefined || !Array.isArray(holes)) {
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
    }
    await kv.hset('trip_results', { [`${date}__${flightIdx}`]: JSON.stringify({ holes }) });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
