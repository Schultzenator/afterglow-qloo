import { runRules } from '../src/agent';
import { MockTasteProvider } from '../src/fixtures';
import { validateBrief } from '../src/types';
import { QlooRateLimitError, QlooTasteProvider } from './qloo';
import { runMistral } from './mistral';
export interface Env { QLOO_API_KEY?: string; QLOO_BASE_URL?: string; QLOO_API_URL?: string; MISTRAL_API_KEY?: string; MISTRAL_MODEL?: string }
const limits = new Map<string, { start: number; count: number }>();
export async function handleApi(request: Request, env: Env, client = 'local'): Promise<Response> {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  const path = new URL(request.url).pathname;
  if (request.method === 'GET' && path === '/api/health') return json({ provider: env.QLOO_API_KEY ? 'qloo' : 'fixture', planner: env.MISTRAL_API_KEY ? 'mistral' : 'rules' });
  if (path !== '/api/plan') return json({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const now = Date.now();
  if (limits.size > 10000) for (const [key, value] of limits) if (now - value.start > 60000) limits.delete(key);
  const bucket = limits.get(client);
  if (bucket && now - bucket.start < 60000) {
    if (++bucket.count > 8) return json({ error: 'A few too many evenings at once. Please try again in a minute.' }, 429);
  } else limits.set(client, { start: now, count: 1 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send JSON.' }, 415);
  // Read bounded bytes rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing brief.' }, 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.length;
    if (size > 12000) { await reader.cancel(); return json({ error: 'Brief too large.' }, 413); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let brief;
  try { brief = validateBrief(JSON.parse(new TextDecoder().decode(bytes))); }
  catch (err) { return json({ error: err instanceof Error ? err.message : 'Invalid brief.' }, 400); }
  try {
    const provider = env.QLOO_API_KEY ? new QlooTasteProvider(env.QLOO_API_KEY, env.QLOO_BASE_URL || env.QLOO_API_URL) : new MockTasteProvider();
    const plan = env.MISTRAL_API_KEY ? await runMistral(brief, provider, env.MISTRAL_API_KEY, env.MISTRAL_MODEL) : await runRules(brief, provider);
    return json(plan);
  } catch (err) {
    if (err instanceof QlooRateLimitError) {
      try {
        const plan = await runRules(brief, new MockTasteProvider());
        plan.warnings.unshift('Qloo is rate limited right now; these are curated demo fixtures. Please try again shortly for live recommendations.');
        return json(plan);
      } catch (fallbackErr) { err = fallbackErr; }
    }
    return json({ error: err instanceof Error ? err.message : 'Could not plan this evening.' }, 502);
  }
}
