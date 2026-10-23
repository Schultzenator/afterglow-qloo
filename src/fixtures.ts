import type { Entity, EntityType, TasteProvider, DiscoverInput } from './types';
// Hand-authored demo fixtures. IDs and affinities are synthetic, never Qloo data.
const row = (id: string, name: string, type: EntityType, description: string, tags: string[], city?: string): Entity => ({ id: `demo-${id}`, name, type, description, tags, city, source: 'fixture' });
export const catalog: Entity[] = [
  row('khruangbin', 'Khruangbin', 'artist', 'Unhurried grooves, with a passport full of influences.', ['dreamy', 'soulful', 'warm']),
  row('wes', 'Wes Anderson', 'person', 'Meticulous worlds, dry wit and a soft spot for outsiders.', ['playful', 'cinematic', 'warm']),
  row('murakami', 'Haruki Murakami', 'person', 'Late-night jazz and the surreal in the everyday.', ['dreamy', 'jazz', 'quiet']),
  row('radiohead', 'Radiohead', 'artist', 'Restless textures and beautifully strange arrangements.', ['experimental', 'electronic', 'cinematic']),
  row('beyonce', 'Beyoncé', 'artist', 'Expansive pop, soul and dance-floor energy.', ['energetic', 'soulful', 'bold']),
  row('kendrick', 'Kendrick Lamar', 'artist', 'Storytelling, jazz textures and an unmistakable voice.', ['bold', 'jazz', 'soulful']),
  row('nolan', 'Christopher Nolan', 'person', 'Big ideas, intricate structures, cinematic scale.', ['cinematic', 'experimental', 'bold']),
  row('daftpunk', 'Daft Punk', 'artist', 'A bridge between disco warmth and electronic precision.', ['electronic', 'energetic', 'playful']),
  row('laufey', 'Laufey', 'artist', 'A romantic meeting of jazz and modern songwriting.', ['jazz', 'warm', 'quiet']),
  row('nina', 'Nina Simone', 'artist', 'A singular voice moving between jazz, soul and protest.', ['jazz', 'soulful', 'bold']),
  row('spirited', 'Spirited Away', 'movie', 'A wondrous passage into an unfamiliar world.', ['dreamy', 'playful', 'cinematic']),
  row('grand', 'The Grand Budapest Hotel', 'movie', 'A storybook caper with melancholy at its edges.', ['warm', 'playful', 'cinematic']),
  row('air', 'Air', 'artist', 'French electronic pop with a soft, cinematic glow.', ['dreamy', 'electronic', 'cinematic']),
  row('menitrust', 'Men I Trust', 'artist', 'Intimate indie pop with warm bass and floating vocals.', ['dreamy', 'quiet', 'warm']),
  row('badbad', 'BADBADNOTGOOD', 'artist', 'A jazz trio taking the scenic route through hip-hop and soul.', ['jazz', 'soulful', 'experimental']),
  row('jungle', 'Jungle', 'artist', 'Sunlit modern soul built for a living-room dance floor.', ['energetic', 'soulful', 'warm']),
  row('bonobo', 'Bonobo', 'artist', 'Detailed electronics with a very human pulse.', ['electronic', 'dreamy', 'warm']),
  row('parcels', 'Parcels', 'artist', 'A tightly locked groove between disco and pop.', ['playful', 'energetic', 'warm']),
  row('floating', 'Floating Points', 'artist', 'Expansive electronics, jazz curiosity and patient builds.', ['experimental', 'electronic', 'jazz']),
  row('sade', 'Sade', 'artist', 'Elegant, spacious soul for the slow part of the evening.', ['soulful', 'quiet', 'warm']),
  row('moonrise', 'Moonrise Kingdom', 'movie', 'An offbeat escape for two young outsiders.', ['playful', 'warm', 'cinematic']),
  row('perfect', 'Perfect Days', 'movie', 'Small rituals, music on tape and the poetry of paying attention.', ['quiet', 'warm', 'dreamy']),
  row('amelie', 'Amélie', 'movie', 'An everyday world reimagined through small acts of magic.', ['playful', 'warm', 'dreamy']),
  row('her', 'Her', 'movie', 'A tender, speculative romance wrapped in soft city light.', ['dreamy', 'cinematic', 'experimental']),
  row('soul', 'Soul', 'movie', 'A jazz-inflected reminder to notice the ordinary.', ['jazz', 'playful', 'soulful']),
  row('arrival', 'Arrival', 'movie', 'A thoughtful science-fiction story about language and connection.', ['cinematic', 'experimental', 'quiet']),
  row('everything', 'Everything Everywhere All at Once', 'movie', 'A wildly inventive trip with a family story at its center.', ['bold', 'experimental', 'energetic']),
  row('lalaland', 'La La Land', 'movie', 'A bright musical balancing ambition and romance.', ['jazz', 'energetic', 'cinematic']),
  row('mogador', 'Café Mogador', 'place', 'Moroccan-inspired dining for a warm, lingering start.', ['warm', 'soulful', 'playful'], 'New York'),
  row('diner', 'Diner', 'place', 'A neighborhood dinner with an unhurried, independent spirit.', ['quiet', 'warm', 'cinematic'], 'New York'),
  row('veselka', 'Veselka', 'place', 'Comfort food and an East Village institution.', ['playful', 'warm', 'bold'], 'New York'),
  row('rule', 'Rule of Thirds', 'place', 'Japanese-inspired food and a contemporary Brooklyn setting.', ['experimental', 'dreamy', 'quiet'], 'New York'),
  row('dishoom', 'Dishoom', 'place', 'Bombay café inspiration, shared plates and a lively room.', ['warm', 'soulful', 'energetic'], 'London'),
  row('brunswick', 'Brunswick House', 'place', 'A characterful dining room with a sense of theater.', ['playful', 'cinematic', 'bold'], 'London'),
  row('sessions', 'Sessions Arts Club', 'place', 'A romantic setting that blurs dining and art.', ['dreamy', 'quiet', 'experimental'], 'London'),
  row('kiln', 'Kiln', 'place', 'Thai-inspired cooking with fire and energy.', ['bold', 'energetic', 'soulful'], 'London'),
  row('bibenda', 'Bibenda', 'place', 'Vegetable-forward plates with a warm neighborhood feel.', ['warm', 'playful', 'soulful'], 'Warsaw'),
  row('ale', 'Ale Wino', 'place', 'An intimate setting for a slower dinner.', ['quiet', 'dreamy', 'cinematic'], 'Warsaw'),
  row('regina', 'Regina', 'place', 'A playful meeting of flavors and a lively atmosphere.', ['bold', 'energetic', 'playful'], 'Warsaw'),
  row('kieliszki', 'Kieliszki na Próżnej', 'place', 'Polish cooking with a thoughtful, contemporary approach.', ['experimental', 'warm', 'quiet'], 'Warsaw'),
];
export class MockTasteProvider implements TasteProvider {
  readonly kind = 'fixture' as const;
  async search(query: string) {
    const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const q = normalize(query);
    return { query, entities: q.length < 2 ? [] : catalog.filter(e => normalize(e.name).includes(q) || q.includes(normalize(e.name))).slice(0, 4) };
  }
  async discover(input: DiscoverInput) {
    const seeds = catalog.filter(e => input.seeds.includes(e.id));
    if (!seeds.length) throw new Error('Resolve at least one taste anchor first.');
    const tags = seeds.flatMap(e => e.tags);
    return catalog.filter(e => e.type === input.type && !input.exclude.includes(e.id) && !input.seeds.includes(e.id) && (e.type !== 'place' || e.city === input.city))
      .map(e => ({ ...e, affinity: e.tags.reduce((n, t) => n + tags.filter(tag => tag === t).length, 0) / (tags.length || 1) }))
      .sort((a, b) => (b.affinity! - a.affinity!) || a.id.localeCompare(b.id))
      .filter((_, i) => !input.adventurous || i > 0).slice(0, 5);
  }
}
