import { createPublishedSnapshot } from '../content-store/snapshot';
import type { ContentStore, SaveDraftInput } from '../content-store/types';
import { errorResponse, jsonResponse } from './response';

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export async function handleApiRequest(request: Request, store: ContentStore): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/api/items/draft') {
    const input = await readJson<SaveDraftInput>(request);
    const draft = await store.saveDraft(input);
    return jsonResponse(draft);
  }

  if (request.method === 'POST' && url.pathname === '/api/items/publish') {
    const input = await readJson<{
      siteId: string;
      collectionId: string;
      itemId: string;
      updatedBy: string;
    }>(request);
    const published = await store.publishDraft(input.siteId, input.collectionId, input.itemId, input.updatedBy);
    return jsonResponse(published);
  }

  if (request.method === 'GET' && url.pathname === '/api/snapshot') {
    const siteId = url.searchParams.get('siteId');
    if (!siteId) {
      return errorResponse('Missing siteId query parameter');
    }
    return jsonResponse(await createPublishedSnapshot(store, siteId));
  }

  return errorResponse('Not found', 404);
}
