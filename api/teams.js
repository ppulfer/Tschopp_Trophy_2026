import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const date = url.searchParams.get('date');
    if (date) {
      const raw = await kv.hget('trip_teams', date);
      const teams = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
      return new Response(JSON.stringify({ teams }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    const all = (await kv.hgetall('trip_teams')) || {};
    const parsed = {};
    Object.entries(all).forEach(([k, v]) => {
      parsed[k] = typeof v === 'string' ? JSON.parse(v) : v;
    });
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST') {
    const { date, teams } = await request.json();
    if (!date || !Array.isArray(teams)) {
      return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
    }
    await kv.hset('trip_teams', { [date]: JSON.stringify(teams) });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
