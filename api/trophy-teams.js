import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'GET') {
    const raw = (await kv.hgetall('trip_trophy_teams')) || {};
    return new Response(JSON.stringify(raw), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (request.method === 'POST') {
    const { playerKey, team } = await request.json();
    if (!playerKey) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
    if (team) {
      await kv.hset('trip_trophy_teams', { [playerKey]: team });
    } else {
      await kv.hdel('trip_trophy_teams', playerKey);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
