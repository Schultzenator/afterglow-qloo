import type { DiscoverInput, Entity, EntityType, TasteProvider } from '../src/types';

type Raw = Record<string, any>;
export class QlooRateLimitError extends Error {
  constructor() {
    super('Qloo is rate limited. Please try again shortly.');
    this.name = 'QlooRateLimitError';
  }
}
export function normalizeEntity(raw: Raw, fallback?: EntityType): Entity | null {
  const id = raw.entity_id ?? raw.id;
  const rawType = raw.type ?? raw.types?.find((t: string) => t.startsWith('urn:entity:'));
  const parsed = rawType?.replace('urn:entity:', '');
  const type = parsed && ['artist', 'place', 'movie', 'person', 'book'].includes(parsed) ? parsed : fallback;
  if (typeof id !== 'string' || typeof raw.name !== 'string' || !['artist', 'place', 'movie', 'person', 'book'].includes(type)) return null;
  const p = raw.properties ?? {};
  const affinity = raw.query?.affinity ?? raw.query?.affinity_score;
  return { id, name: raw.name, type, description: p.short_description ?? p.description ?? '', tags: (raw.tags ?? []).map((t: Raw | string) => typeof t === 'string' ? t : t.name).filter(Boolean).slice(0, 6), city: p.geocode?.city, affinity: typeof affinity === 'number' ? affinity : undefined, source: 'qloo', explainability: raw.query?.explainability };
}
export class QlooTasteProvider implements TasteProvider {
  readonly kind = 'qloo' as const;
  private base: string;
  constructor(private key: string, base = 'https://api.qloo.com', private request: typeof fetch = fetch) {
    const url = new URL(base);
    if (url.protocol !== 'https:' || !['api.qloo.com', 'hackathon.api.qloo.com', 'staging.api.qloo.com'].includes(url.hostname) || url.port || url.username || url.password) throw new Error('Unsupported Qloo API origin.');
    this.base = url.origin;
  }
  private async get(path: string, params: Record<string, string>): Promise<Raw> {
    const url = new URL(path, this.base);
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
    const res = await this.request(url, { headers: { 'X-Api-Key': this.key, accept: 'application/json' }, signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (res.status === 404 && path === '/search') return { results: [] };
    if (res.status === 429) throw new QlooRateLimitError();
    if (!res.ok) throw new Error(`Qloo returned ${res.status}. Check the server API configuration.`);
    return res.json();
  }
  async search(query: string) {
    const data = await this.get('/search', { query, take: '5' });
    const rows = Array.isArray(data.results) ? data.results : data.results?.entities;
    if (!Array.isArray(rows)) throw new Error('Unexpected Qloo search response.');
    return { query, entities: rows.map(r => normalizeEntity(r)).filter((e): e is Entity => !!e) };
  }
  async discover(input: DiscoverInput) {
    if (!input.seeds.length) throw new Error('Resolve taste anchors before requesting recommendations.');
    const data = await this.get('/v2/insights', {
      'filter.type': `urn:entity:${input.type}`,
      'signal.interests.entities': input.seeds.join(','),
      'filter.exclude.entities': [...new Set([...input.seeds, ...input.exclude])].join(','),
      'feature.explainability': 'true', take: '8',
      ...(input.type === 'place' ? { 'filter.location.query': input.city, 'filter.location.radius': '0', 'filter.price_level.max': String(input.priceLevel) } : {}),
      ...(input.adventurous ? { 'filter.popularity.max': '0.9' } : {}),
    });
    const rows = data.results?.entities;
    if (!Array.isArray(rows)) throw new Error('Unexpected Qloo insights response.');
    // Never fabricate an empty category or silently downgrade live Qloo to fixtures.
    return rows.map((r: Raw) => normalizeEntity(r, input.type)).filter((e: Entity | null): e is Entity => !!e && e.type === input.type && !input.exclude.includes(e.id) && !input.seeds.includes(e.id));
  }
}
