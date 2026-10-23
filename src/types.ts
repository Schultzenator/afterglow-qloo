export type Category = 'artist' | 'place' | 'movie';
export type EntityType = Category | 'person' | 'book';
export interface Entity {
  id: string; name: string; type: EntityType; description: string;
  tags: string[]; city?: string; affinity?: number;
  source: 'fixture' | 'qloo'; explainability?: unknown;
}
export interface SearchResult { query: string; entities: Entity[] }
export interface DiscoverInput { type: Category; seeds: string[]; city: string; exclude: string[]; adventurous: boolean; priceLevel: number }
export interface TasteProvider {
  kind: 'fixture' | 'qloo';
  search(query: string): Promise<SearchResult>;
  discover(input: DiscoverInput): Promise<Entity[]>;
}
export interface Brief { prompt: string; city: string; budget: number; people: number; adventurous: boolean; exclude: string[] }
export interface TraceEvent { tool: string; input: unknown; output: unknown; durationMs: number; status: 'ok' | 'error' }
export interface Plan {
  title: string; note: string; seeds: Entity[]; picks: Record<Category, Entity>;
  reasons: Record<Category, string>; trace: TraceEvent[];
  provider: TasteProvider['kind']; planner: 'rules' | 'mistral'; warnings: string[];
  budget: { dining: number; film: number; reserve: number };
}
export const categories: Category[] = ['artist', 'place', 'movie'];
export function validateBrief(value: unknown): Brief {
  const b = value as Partial<Brief> | null;
  if (!b || typeof b.prompt !== 'string' || b.prompt.trim().length < 3 || b.prompt.length > 1600) throw new Error('Describe your taste in 3–1600 characters.');
  if (typeof b.city !== 'string' || b.city.length < 2 || b.city.length > 80) throw new Error('Choose a city.');
  if (!Number.isFinite(b.budget) || b.budget! < 20 || b.budget! > 1000) throw new Error('Budget must be $20–$1,000.');
  if (!Number.isInteger(b.people) || b.people! < 1 || b.people! > 8) throw new Error('Choose 1–8 people.');
  if (!Array.isArray(b.exclude) || b.exclude.length > 80 || b.exclude.some(id => typeof id !== 'string' || id.length > 100)) throw new Error('Invalid exclusions.');
  return { prompt: b.prompt.trim(), city: b.city.trim(), budget: b.budget!, people: b.people!, adventurous: b.adventurous === true, exclude: b.exclude };
}
