import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const VALID_PLAYERS = [
  'parli','schrafl','hodgskin','pulfer','fzimmermann','teulings',
  'ruetimann','wieser','laenzlinger','hunter','graf','debrunner',
  'szimmermann','heule','wyser'
];
const VALID_FIELDS = ['beer', 'balls', 'birdies'];

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { player, field, delta } = body;

    if (!VALID_PLAYERS.includes(player)) {
      return new Response(JSON.stringify({ error: 'Invalid player' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!VALID_FIELDS.includes(field)) {
      return new Response(JSON.stringify({ error: 'Invalid field' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const d = parseInt(delta, 10);
    if (isNaN(d) || Math.abs(d) > 10) {
      return new Response(JSON.stringify({ error: 'Invalid delta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const hour = now.getHours();
    const trackDate = hour < 5 ? new Date(now.getTime() - 86400000) : now;
    const today = trackDate.toISOString().split('T')[0];
    const key = player + '__' + field + '__' + today;
    const newVal = await kv.hincrby('trip_stats', key, d);
    // Verhindere negative Werte
    if (newVal < 0) {
      await kv.hset('trip_stats', { [key]: 0 });
    }

    // Publish notification for birdies and beers
    if ((field === 'birdies' || field === 'beer') && d > 0) {
      const finalValue = Math.max(0, newVal);
      const timestamp = Date.now();
      const eventData = JSON.stringify({ player, field, value: finalValue, timestamp });
      try {
        console.log('EVENT_SAVE_START', { player, field, timestamp, eventData });

        // Try lpush
        const pushResult = await kv.lpush('game_events_list', eventData);
        console.log('LPUSH_RESULT', pushResult);

        // Check if it was saved
        const checkResult = await kv.llen('game_events_list');
        console.log('LIST_LENGTH_AFTER', checkResult);

        // Keep only last 100 events
        await kv.ltrim('game_events_list', 0, 99);
        console.log('EVENT_SAVE_COMPLETE');
      } catch (e) {
        console.error('KV_ERROR', { message: e.message, stack: e.stack });
      }
    }

    return new Response(JSON.stringify({ key, value: Math.max(0, newVal) }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
