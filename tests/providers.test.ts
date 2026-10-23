import test from 'node:test';
import assert from 'node:assert/strict';
import { QlooTasteProvider } from '../server/qloo';
import { runMistral } from '../server/mistral';
import { MockTasteProvider } from '../src/fixtures';
import { handleApi } from '../server/api';
import type { Brief } from '../src/types';
const brief: Brief = { prompt: 'I love Khruangbin and Wes Anderson', city: 'New York', budget: 100, people: 2, adventurous: false, exclude: [] };
test('Qloo search and insights contract, headers, filters, and response mapping', async () => {
  const requests: { url: URL; headers: Headers }[] = [];
  const fakeFetch: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url)); requests.push({ url: parsed, headers: new Headers(init?.headers) });
    return Response.json(parsed.pathname === '/search' ? { results: [{ entity_id: 'seed-uuid', name: 'Khruangbin', types: ['urn:entity:artist'], properties: {} }] } : { results: { entities: [{ entity_id: 'place-uuid', name: 'A returned venue', properties: { geocode: { city: 'New York' }, short_description: 'Real response description' }, query: { affinity: 0.8, explainability: { seed: 0.5 } }, tags: [{ name: 'Dining' }] }] } });
  };
  const qloo = new QlooTasteProvider('test-secret-never-a-real-key', 'https://api.qloo.com', fakeFetch);
  const search = await qloo.search('Khruangbin');
  assert.equal(search.entities[0].type, 'artist');
  const found = await qloo.discover({ type: 'place', seeds: ['seed-uuid'], city: 'New York', exclude: ['rejected-uuid'], adventurous: true, priceLevel: 2 });
  assert.equal(found[0].source, 'qloo'); assert.equal(found[0].affinity, 0.8); assert.equal(found[0].city, 'New York');
  const req = requests[1];
  assert.equal(req.url.pathname, '/v2/insights');
  assert.equal(req.url.searchParams.get('filter.type'), 'urn:entity:place');
  assert.equal(req.url.searchParams.get('filter.location.query'), 'New York');
  assert.equal(req.url.searchParams.get('filter.price_level.max'), '2');
  assert.equal(req.url.searchParams.get('signal.interests.entities'), 'seed-uuid');
  assert.equal(req.url.searchParams.get('filter.exclude.entities'), 'seed-uuid,rejected-uuid');
  assert.equal(req.headers.get('X-Api-Key'), 'test-secret-never-a-real-key');
  assert.ok(!JSON.stringify(found).includes('test-secret'));
});
test('Qloo failures stay explicit and no secret is echoed from upstream', async () => {
  const q = new QlooTasteProvider('test-only', undefined, async () => new Response('sensitive upstream content', { status: 401 }));
  await assert.rejects(q.search('Air'), /Qloo returned 401/);
  assert.throws(() => new QlooTasteProvider('test', 'https://untrusted.example'), /Unsupported/);
  const missing = new QlooTasteProvider('test', undefined, async () => Response.json({ unexpected: true }));
  await assert.rejects(missing.search('Air'), /Unexpected/);
});
test('Mistral performs a real-shaped multi-step tool loop and only uses observed IDs', async () => {
  let step = 0; let finalMessages: any[] = [];
  const fakeFetch: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); finalMessages = body.messages;
    const calls = [
      { name: 'resolve_tastes', arguments: JSON.stringify({ names: ['Khruangbin'] }) },
      ...['artist', 'place', 'movie'].map(type => ({ name: 'discover', arguments: JSON.stringify({ type }) })),
    ];
    let fn = calls[step];
    if (step === 4) {
      const outputs = body.messages.filter((m: any) => m.role === 'tool' && m.name === 'discover').map((m: any) => JSON.parse(m.content));
      fn = { name: 'compose_plan', arguments: JSON.stringify({ artistId: outputs[0][0].id, placeId: outputs[1][0].id, movieId: outputs[2][0].id, title: 'A connected evening', reasons: { artist: 'A curated sample match.', place: 'A warm dinner in your city.', movie: 'An intriguing final chapter.' } }) };
    }
    return Response.json({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: `call${++step}`, type: 'function', function: fn }] } }] });
  };
  const plan = await runMistral(brief, new MockTasteProvider(), 'fake-key', 'test-model', fakeFetch);
  assert.equal(plan.planner, 'mistral'); assert.equal(plan.trace.length, 5); assert.equal(step, 5);
  assert.equal(finalMessages.filter(m => m.role === 'tool').length, 4);
});
test('API validates body and health exposes modes only', async () => {
  const health = await handleApi(new Request('https://example.com/api/health'), { QLOO_API_KEY: 'hidden', MISTRAL_API_KEY: 'also-hidden' });
  assert.deepEqual(await health.json(), { provider: 'qloo', planner: 'mistral' });
  const invalid = await handleApi(new Request('https://example.com/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), {}, 'test-invalid');
  assert.equal(invalid.status, 400);
  const large = await handleApi(new Request('https://example.com/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(13000) }), {}, 'test-large');
  assert.equal(large.status, 413);
  const ok = await handleApi(new Request('https://example.com/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(brief) }), {}, 'test-success');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json() as any).provider, 'fixture');
});
