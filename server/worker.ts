import { handleApi, type Env } from './api';
export default {
  async fetch(request: Request, env: Env & { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env, request.headers.get('cf-connecting-ip') || 'unknown');
    return env.ASSETS.fetch(request);
  },
};
