import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentSession, extractFavorites, runRules } from '../src/agent';
import { MockTasteProvider } from '../src/fixtures';
import { validateBrief, type Brief, type TasteProvider } from '../src/types';
const brief: Brief = { prompt: 'I love Khruangbin and Wes Anderson.', city: 'New York', budget: 100, people: 2, adventurous: false, exclude: [] };
test('demo resolves seeds, discovers all categories, and balances the group envelope', async () => {
  const plan = await runRules(brief, new MockTasteProvider());
  assert.equal(plan.seeds.length, 2);
  assert.deepEqual(plan.trace.map(e => e.tool), ['resolve_tastes', 'discover', 'discover', 'discover', 'compose_plan']);
  assert.equal(plan.picks.place.city, 'New York');
  assert.equal(plan.provider, 'fixture');
  assert.equal(plan.budget.dining + plan.budget.film + plan.budget.reserve, brief.budget);
  for (const pick of Object.values(plan.picks)) assert.ok(!plan.seeds.some(s => s.id === pick.id));
});
test('replanning excludes rejected results and honors the city', async () => {
  for (const city of ['New York', 'London', 'Warsaw']) {
    const first = await runRules({ ...brief, city }, new MockTasteProvider());
    const next = await runRules({ ...brief, city, exclude: [first.picks.place.id, first.picks.movie.id, first.picks.artist.id] }, new MockTasteProvider());
    assert.equal(next.picks.place.city, city);
    for (const type of ['place', 'movie', 'artist'] as const) assert.notEqual(next.picks[type].id, first.picks[type].id);
  }
});
test('surprise setting changes the fixture shortlist', async () => {
  const a = await runRules(brief, new MockTasteProvider());
  const b = await runRules({ ...brief, adventurous: true }, new MockTasteProvider());
  assert.notEqual(a.picks.artist.id, b.picks.artist.id);
});
test('rejects invented IDs and out-of-order tool calls', async () => {
  const s = new AgentSession(brief, new MockTasteProvider(), 'mistral');
  assert.match(JSON.stringify(await s.execute('discover', { type: 'artist' })), /No taste anchors/);
  await s.execute('resolve_tastes', { names: ['Khruangbin'] });
  const result = await s.execute('compose_plan', { artistId: 'invented', placeId: 'invented', movieId: 'invented', title: 'made up', reasons: { artist: 'because', place: 'because', movie: 'because' } });
  assert.match(JSON.stringify(result), /must come from discover/);
  assert.equal(s.plan, undefined);
  assert.match(JSON.stringify(await s.execute('shell', { command: 'anything' })), /Unknown tool/);
});
test('unknown names and empty discovery fail rather than fabricating a result', async () => {
  await assert.rejects(runRules({ ...brief, prompt: 'I love "An unknown title".' }, new MockTasteProvider()), /Could not resolve/);
  // A longer unknown name containing "her" must not silently resolve to the film Her.
  assert.equal((await new MockTasteProvider().search('Other unrelated band')).entities.length, 0);
  const empty: TasteProvider = { kind: 'qloo', search: q => new MockTasteProvider().search(q), discover: async () => [] };
  await assert.rejects(runRules(brief, empty), /No artist matches/);
});
test('ambiguous names are not silently taken as the first result', async () => {
  const fixture = new MockTasteProvider();
  const provider: TasteProvider = { kind: 'qloo', search: async query => ({ query, entities: [{ ...(await fixture.search('Air')).entities[0], name: 'Air One' }, { ...(await fixture.search('Air')).entities[0], name: 'Air Two', id: 'another-id' }] }), discover: input => fixture.discover(input) };
  const s = new AgentSession(brief, provider, 'rules');
  await s.execute('resolve_tastes', { names: ['Air'] });
  assert.equal(s.seeds.length, 0);
  assert.match(s.warnings[0], /ambiguous/);
});
test('request validation rejects malformed and oversized briefs', () => {
  assert.throws(() => validateBrief({ ...brief, budget: 0 }), /Budget/);
  assert.throws(() => validateBrief({ ...brief, people: 1.5 }), /people/);
  assert.throws(() => validateBrief({ ...brief, exclude: [42] }), /exclusions/);
  assert.throws(() => validateBrief({ ...brief, prompt: 'x'.repeat(1601) }), /characters/);
  assert.deepEqual(extractFavorites('I love "New Artist" and Khruangbin'), ['Khruangbin', 'New Artist']);
  assert.deepEqual(extractFavorites('I love a chair.'), []);
  assert.deepEqual(extractFavorites('I hate Radiohead. I love Khruangbin.'), ['Khruangbin']);
});
