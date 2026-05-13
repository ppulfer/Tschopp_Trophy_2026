import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const VALID_PLAYERS = [
  'parli','schrafl','hodgskin','pulfer','fzimmermann','teulings',
  'ruetimann','wieser','laenzlinger','hunter','graf','debrunner',
  'szimmermann','heule','wyser'
];
const VALID_FIELDS = ['longestDrive', 'nearestPin'];

export default async function handler(request) {
  if (request.method === 'GET') {
    const data = (await kv.hgetall('trip_trackers')) || {};
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (request.method === 'POST') {
    try {
      const { player, field, value } = await request.json();
      if (!VALID_PLAYERS.includes(player)) {
        return new Response(JSON.stringify({ error: 'invalid player' }), { status: 400 });
      }
      if (!VALID_FIELDS.includes(field)) {
        return new Response(JSON.stringify({ error: 'invalid field' }), { status: 400 });
      }
      const key = `${player}__${field}`;
      if (value === '' || value === null || value === undefined) {
        await kv.hdel('trip_trackers', key);
        return new Response(JSON.stringify({ ok: true, deleted: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10000) {
        return new Response(JSON.stringify({ error: 'invalid value' }), { status: 400 });
      }
      await kv.hset('trip_trackers', { [key]: num });
      return new Response(JSON.stringify({ ok: true, value: num }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
