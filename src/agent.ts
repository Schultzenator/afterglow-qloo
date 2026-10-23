import { catalog } from './fixtures';
import { categories, type Brief, type Category, type Entity, type Plan, type TasteProvider, type TraceEvent } from './types';

const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required, additionalProperties: false });
export const tools = [
  { type: 'function', function: { name: 'resolve_tastes', description: 'Resolve 1–5 explicitly mentioned favorite cultural entities by name. Use only favorites from the user brief. If ambiguous, report candidates; never invent an ID.', parameters: objectSchema({ names: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 } }, ['names']) } },
  { type: 'function', function: { name: 'discover', description: 'Get Qloo taste recommendations using previously resolved favorites. Call once for each of artist, place, movie. Location, exclusions and dining price filter are enforced from the user brief. Returns ranked candidates, not bookable inventory.', parameters: objectSchema({ type: { type: 'string', enum: categories } }, ['type']) } },
  { type: 'function', function: { name: 'compose_plan', description: 'Finish a plan. Choose one ID per category from candidates returned by discover. All categories must have been discovered. Never invent entities. Write a short title and a contextual reason per pick; do not claim verified prices, availability, dietary safety, or a causal taste connection that the data does not provide.', parameters: objectSchema({ artistId: { type: 'string' }, placeId: { type: 'string' }, movieId: { type: 'string' }, title: { type: 'string' }, reasons: objectSchema({ artist: { type: 'string' }, place: { type: 'string' }, movie: { type: 'string' } }, categories) }, ['artistId', 'placeId', 'movieId', 'title', 'reasons']) } },
];

export class AgentSession {
  seeds: Entity[] = [];
  candidates: Partial<Record<Category, Entity[]>> = {};
  trace: TraceEvent[] = [];
  warnings: string[] = [];
  plan?: Plan;
  constructor(readonly brief: Brief, readonly provider: TasteProvider, readonly planner: Plan['planner'], private onEvent?: (e: TraceEvent) => void) {}
  async execute(tool: string, raw: unknown): Promise<unknown> {
    const start = Date.now();
    let output: unknown;
    let status: TraceEvent['status'] = 'ok';
    try { output = await this.dispatch(tool, raw); }
    catch (err) { status = 'error'; output = { error: err instanceof Error ? err.message : 'Tool failed.' }; }
    const event = { tool, input: raw, output, status, durationMs: Date.now() - start };
    this.trace.push(event); this.onEvent?.(event);
    if (this.plan) this.plan.trace = [...this.trace];
    return output;
  }
  private async dispatch(tool: string, raw: unknown): Promise<unknown> {
    if (this.plan) throw new Error('Plan already complete.');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Tool input must be an object.');
    const args = raw as Record<string, any>;
    if (tool === 'resolve_tastes') {
      if (this.seeds.length || Object.keys(this.candidates).length) throw new Error('Taste anchors are already resolved.');
      if (!Array.isArray(args.names) || args.names.length < 1 || args.names.length > 5 || args.names.some((n: unknown) => typeof n !== 'string' || n.length > 120 || n.length < 2)) throw new Error('Supply 1–5 favorite names.');
      const results = [];
      for (const name of args.names) {
        const found = await this.provider.search(name);
        const exact = found.entities.find(e => e.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0);
        const selected = exact ?? (found.entities.length === 1 ? found.entities[0] : undefined);
        if (selected && !this.seeds.some(e => e.id === selected.id)) this.seeds.push(selected);
        if (!selected) this.warnings.push(found.entities.length ? `“${name}” is ambiguous and was left out. Use the exact title or artist name.` : `Could not resolve “${name}”. It was left out.`);
        results.push({ query: name, selected: selected ?? null, alternatives: found.entities });
      }
      return results;
    }
    if (tool === 'discover') {
      if (!categories.includes(args.type)) throw new Error('Unsupported category.');
      if (!this.seeds.length) throw new Error('No taste anchors resolved. Try the example brief or quote a favorite artist or film.');
      const type = args.type as Category;
      const perPerson = this.brief.budget * 0.65 / this.brief.people;
      const candidates = await this.provider.discover({ type, seeds: this.seeds.map(e => e.id), exclude: this.brief.exclude, city: this.brief.city, adventurous: this.brief.adventurous, priceLevel: perPerson < 25 ? 1 : perPerson < 50 ? 2 : perPerson < 85 ? 3 : 4 });
      this.candidates[type] = candidates;
      if (!candidates.length) throw new Error(`No ${type} matches for these constraints. Try another city, increase the budget or reset exclusions.`);
      return candidates;
    }
    if (tool === 'compose_plan') {
      const picks = {} as Record<Category, Entity>;
      const reasons = {} as Record<Category, string>;
      for (const type of categories) {
        const pick = this.candidates[type]?.find(e => e.id === args[`${type}Id`]);
        if (!pick) throw new Error(`The selected ${type} must come from discover results.`);
        const reason = args.reasons?.[type];
        if (typeof reason !== 'string' || reason.length < 5 || reason.length > 400) throw new Error('Provide a short reason for each pick.');
        picks[type] = pick; reasons[type] = reason;
      }
      if (typeof args.title !== 'string' || args.title.length < 3 || args.title.length > 100) throw new Error('Provide a short title.');
      const dining = Math.floor(this.brief.budget * 0.65), film = Math.floor(this.brief.budget * 0.12);
      this.plan = { title: args.title, note: 'Music to set the mood. A table to linger at. A film to stay with you.', picks, reasons, seeds: [...this.seeds], trace: [], provider: this.provider.kind, planner: this.planner, warnings: [...this.warnings], budget: { dining, film, reserve: this.brief.budget - dining - film } };
      return { complete: true, picks: Object.fromEntries(categories.map(t => [t, picks[t].name])) };
    }
    throw new Error('Unknown tool.');
  }
}

export function extractFavorites(prompt: string): string[] {
  const known = catalog.filter(e => {
    const escaped = e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').exec(prompt);
    if (!match) return false;
    const before = prompt.slice(Math.max(0, match.index - 35), match.index);
    return !/(?:hate|dislike|don't like|do not like|not|avoid)\s+$/i.test(before);
  }).map(e => e.name);
  const quoted = [...prompt.matchAll(/[“"]([^”"]{2,120})[”"]/g)].map(m => m[1]);
  return [...new Set([...known, ...quoted])].slice(0, 5);
}
export async function runRules(brief: Brief, provider: TasteProvider, onEvent?: (e: TraceEvent) => void): Promise<Plan> {
  const session = new AgentSession(brief, provider, 'rules', onEvent);
  const names = extractFavorites(brief.prompt);
  if (!names.length) throw new Error('For the rule-based planner, put favorite artist or film names in double quotes, or try an example.');
  await session.execute('resolve_tastes', { names });
  if (!session.seeds.length) throw new Error(session.warnings.join(' ') || 'No taste anchors resolved.');
  for (const type of categories) {
    const result = await session.execute('discover', { type });
    if (!session.candidates[type]?.length) throw new Error((result as { error: string }).error);
  }
  const picks = Object.fromEntries(categories.map(type => [type, session.candidates[type]![0]])) as Record<Category, Entity>;
  const reasons = Object.fromEntries(categories.map(type => {
    const overlap = [...new Set(picks[type].tags.filter(t => session.seeds.some(s => s.tags.includes(t))))];
    return [type, provider.kind === 'fixture'
      ? `The demo's ${overlap.slice(0, 2).join(' + ') || 'eclectic'} tags connect this pick to your favorites. This is a curated illustration of a cross-category match.`
      : `Returned by Qloo using ${session.seeds.map(e => e.name).join(' and ')} as taste signals${type === 'place' ? `, with a location filter for ${brief.city}` : ''}.`];
  })) as Record<Category, string>;
  await session.execute('compose_plan', { artistId: picks.artist.id, placeId: picks.place.id, movieId: picks.movie.id, title: brief.adventurous ? 'A little outside your usual.' : 'Your taste. A new kind of evening.', reasons });
  if (!session.plan) throw new Error('Could not compose the evening.');
  return session.plan;
}
