import { D1ContentStore } from '../content-store/d1-store';
import type { Env } from './env';
import { handleApiRequest } from './routes';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, new D1ContentStore(env.CLASTRO_DB));
    }

    return new Response('Clastro Codex Worker', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
