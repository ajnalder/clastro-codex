import { createPublishedSnapshot } from '../content-store/snapshot';
import type { ContentStore, SaveDraftInput, SavePageRegionDraftInput } from '../content-store/types';
import type { MediaStorage } from '../media/storage';
import type { MediaVariantId } from '../media/types';
import { createMediaVariantManifest } from '../media/variants';
import { errorResponse, jsonResponse } from './response';

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export async function handleApiRequest(
  request: Request,
  store: ContentStore,
  mediaStorage?: MediaStorage,
): Promise<Response> {
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

  if (url.pathname === '/api/page-regions/draft') {
    if (request.method === 'POST') {
      const input = await readJson<SavePageRegionDraftInput>(request);
      const draft = await store.savePageRegionDraft(input);
      return jsonResponse(draft);
    }

    if (request.method === 'GET') {
      const siteId = url.searchParams.get('siteId');
      const pageId = url.searchParams.get('pageId');
      if (!siteId || !pageId) {
        return errorResponse('Missing siteId or pageId query parameter');
      }
      return jsonResponse({
        regions: await store.listPageRegionDrafts(siteId, pageId),
      });
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/page-regions/published') {
    const siteId = url.searchParams.get('siteId');
    const pageId = url.searchParams.get('pageId');
    if (!siteId || !pageId) {
      return errorResponse('Missing siteId or pageId query parameter');
    }
    return jsonResponse({
      regions: await store.listPublishedPageRegions(siteId, pageId),
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/page-regions/publish') {
    const input = await readJson<{
      siteId: string;
      pageId: string;
      updatedBy: string;
    }>(request);
    return jsonResponse({
      regions: await store.publishPageRegionDrafts(input.siteId, input.pageId, input.updatedBy),
    });
  }

  if (url.pathname === '/api/media') {
    if (request.method === 'GET') {
      const siteId = url.searchParams.get('siteId');
      if (!siteId) {
        return errorResponse('Missing siteId query parameter');
      }
      return jsonResponse({ assets: await store.listMediaAssets(siteId) });
    }

    if (request.method === 'POST') {
      if (!mediaStorage) {
        return errorResponse('Media storage is not configured', 500);
      }
      const form = await request.formData();
      const siteId = String(form.get('siteId') ?? '');
      if (!siteId) {
        return errorResponse('Missing siteId');
      }
      const width = Number(form.get('width'));
      const height = Number(form.get('height'));
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return errorResponse('Invalid image dimensions');
      }
      const assetId = crypto.randomUUID();
      const bytesByVariant = JSON.parse(String(form.get('bytesByVariant') ?? '{}')) as Record<MediaVariantId, number>;
      const variants = createMediaVariantManifest({
        siteId,
        assetId,
        sourceSize: { width, height },
        bytesByVariant,
      });

      for (const variantId of ['thumb', 'card', 'large'] as const) {
        const blob = form.get(variantId);
        if (!(blob instanceof Blob)) {
          return errorResponse(`Missing ${variantId} image variant`);
        }
        await mediaStorage.put(variants[variantId].r2Key, blob);
      }

      return jsonResponse(await store.saveMediaAsset({
        siteId,
        assetId,
        filename: String(form.get('filename') ?? 'image.webp'),
        altText: String(form.get('altText') ?? ''),
        caption: String(form.get('caption') ?? ''),
        width,
        height,
        variants,
      }));
    }
  }

  const mediaUpdateMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/);
  if (mediaUpdateMatch && request.method === 'PATCH') {
    const input = await readJson<{ siteId: string; altText: string; caption: string }>(request);
    return jsonResponse(await store.updateMediaAssetMetadata({
      siteId: input.siteId,
      assetId: mediaUpdateMatch[1],
      altText: input.altText,
      caption: input.caption,
    }));
  }

  const mediaVariantMatch = url.pathname.match(/^\/api\/media\/([^/]+)\/(thumb|card|large)$/);
  if (mediaVariantMatch && request.method === 'GET') {
    if (!mediaStorage) {
      return errorResponse('Media storage is not configured', 500);
    }
    const siteId = url.searchParams.get('siteId') ?? 'joes-plumbing';
    const asset = (await store.listMediaAssets(siteId)).find((candidate) => candidate.assetId === mediaVariantMatch[1]);
    if (!asset) {
      return errorResponse('Media asset not found', 404);
    }
    const variantId = mediaVariantMatch[2] as MediaVariantId;
    const object = await mediaStorage.get(asset.variants[variantId].r2Key);
    if (!object) {
      return errorResponse('Media variant not found', 404);
    }
    return new Response(object.body, {
      headers: {
        'content-type': object.contentType,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
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
