# Media Library V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Clastro CMS media library for optimized website images, with no original-file retention.

**Architecture:** Image sizing and variant planning live in pure TypeScript modules so they can be tested without browser APIs. The content store owns media metadata in D1 or memory, while a media storage adapter owns optimized WebP blobs in R2 or local memory. The CMS gets a Media view with upload, preview, alt text, and caption editing.

**Tech Stack:** Astro, TypeScript, Vitest, Cloudflare Workers, D1, R2, browser Canvas/WebP APIs.

---

## File Structure

- Create `src/media/types.ts`: Shared media asset, variant, and input types.
- Create `src/media/variants.ts`: Pure functions for target dimensions, variant manifests, and deterministic R2 keys.
- Create `src/media/storage.ts`: Storage adapter interfaces plus an in-memory adapter for tests and local fallback.
- Create `src/media/browser-optimizer.ts`: Browser-only upload optimizer that produces WebP variant blobs.
- Create `tests/media/variants.test.ts`: Unit tests for dimension planning and variant key creation.
- Create `tests/media/storage.test.ts`: Unit tests for in-memory blob storage.
- Modify `src/content-store/types.ts`: Add media metadata methods to `ContentStore`.
- Modify `src/content-store/memory-store.ts`: Store media metadata in memory.
- Modify `src/content-store/d1-store.ts`: Store/list/update media metadata in D1.
- Modify `db/migrations/0001_initial.sql`: Expand `media_assets` columns for variants and dimensions.
- Modify `tests/content-store/memory-store.test.ts`: Cover media metadata save/list/update.
- Modify `tests/content-store/d1-store.test.ts`: Cover D1 media metadata save/list/update.
- Modify `src/worker/routes.ts`: Add `/api/media` routes.
- Modify `src/worker/index.ts`: Pass `env.CLASTRO_MEDIA` into API routing.
- Modify `tests/worker/routes.test.ts`: Cover media create/list/update API behavior.
- Modify `src/cms/sample-content.ts`: Add sample media assets for the CMS grid.
- Modify `src/cms/view-model.ts`: Add Media mode and media view model.
- Modify `src/pages/cms.astro`: Render Media navigation, upload panel, and asset grid.
- Modify `src/cms/client.ts`: Wire metadata edits and upload optimization.
- Modify `src/styles/cms.css`: Style media grid, upload panel, and metadata controls.

## Task 1: Media Variant Planning

**Files:**
- Create: `src/media/types.ts`
- Create: `src/media/variants.ts`
- Test: `tests/media/variants.test.ts`

- [ ] **Step 1: Write the failing variant tests**

```ts
import { describe, expect, it } from 'vitest';
import { createMediaVariantManifest, planImageVariants } from '../../src/media/variants';

describe('planImageVariants', () => {
  it('preserves aspect ratio and does not upscale small images', () => {
    expect(planImageVariants({ width: 1200, height: 800 })).toEqual([
      { id: 'thumb', width: 360, height: 240, quality: 0.78 },
      { id: 'card', width: 900, height: 600, quality: 0.82 },
      { id: 'large', width: 1200, height: 800, quality: 0.84 },
    ]);
  });

  it('creates deterministic variant keys and URLs', () => {
    expect(
      createMediaVariantManifest({
        siteId: 'joes-plumbing',
        assetId: 'asset-123',
        sourceSize: { width: 1200, height: 800 },
        bytesByVariant: { thumb: 12000, card: 48000, large: 92000 },
      }),
    ).toMatchObject({
      thumb: {
        r2Key: 'sites/joes-plumbing/media/asset-123/thumb.webp',
        url: '/api/media/asset-123/thumb',
        width: 360,
        height: 240,
        bytes: 12000,
        contentType: 'image/webp',
      },
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- tests/media/variants.test.ts`

Expected: failure because `src/media/variants.ts` does not exist.

- [ ] **Step 3: Implement media types**

Create `src/media/types.ts`:

```ts
export type MediaVariantId = 'thumb' | 'card' | 'large';

export interface ImageSize {
  width: number;
  height: number;
}

export interface PlannedMediaVariant extends ImageSize {
  id: MediaVariantId;
  quality: number;
}

export interface MediaVariant extends ImageSize {
  r2Key: string;
  url: string;
  bytes: number;
  contentType: 'image/webp';
}

export type MediaVariantManifest = Record<MediaVariantId, MediaVariant>;

export interface MediaAsset {
  siteId: string;
  assetId: string;
  filename: string;
  altText: string;
  caption: string;
  contentType: 'image/webp';
  width: number;
  height: number;
  variants: MediaVariantManifest;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMediaAssetInput {
  siteId: string;
  assetId?: string;
  filename: string;
  altText: string;
  caption?: string;
  width: number;
  height: number;
  variants: MediaVariantManifest;
}

export interface UpdateMediaAssetInput {
  siteId: string;
  assetId: string;
  altText: string;
  caption: string;
}
```

- [ ] **Step 4: Implement variant planning**

Create `src/media/variants.ts`:

```ts
import type { ImageSize, MediaVariantId, MediaVariantManifest, PlannedMediaVariant } from './types';

const targets: Array<{ id: MediaVariantId; maxWidth: number; quality: number }> = [
  { id: 'thumb', maxWidth: 360, quality: 0.78 },
  { id: 'card', maxWidth: 900, quality: 0.82 },
  { id: 'large', maxWidth: 1800, quality: 0.84 },
];

function scaleToWidth(size: ImageSize, maxWidth: number): ImageSize {
  const width = Math.min(size.width, maxWidth);
  return {
    width,
    height: Math.round((width / size.width) * size.height),
  };
}

export function planImageVariants(size: ImageSize): PlannedMediaVariant[] {
  return targets.map((target) => ({
    id: target.id,
    ...scaleToWidth(size, target.maxWidth),
    quality: target.quality,
  }));
}

export function createMediaVariantManifest(input: {
  siteId: string;
  assetId: string;
  sourceSize: ImageSize;
  bytesByVariant: Record<MediaVariantId, number>;
}): MediaVariantManifest {
  return Object.fromEntries(
    planImageVariants(input.sourceSize).map((variant) => [
      variant.id,
      {
        r2Key: `sites/${input.siteId}/media/${input.assetId}/${variant.id}.webp`,
        url: `/api/media/${input.assetId}/${variant.id}`,
        width: variant.width,
        height: variant.height,
        bytes: input.bytesByVariant[variant.id],
        contentType: 'image/webp' as const,
      },
    ]),
  ) as MediaVariantManifest;
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test -- tests/media/variants.test.ts`

Expected: 2 passing tests.

- [ ] **Step 6: Commit**

```bash
git add src/media/types.ts src/media/variants.ts tests/media/variants.test.ts
git commit -m "feat: plan media image variants"
```

## Task 2: Media Metadata Store

**Files:**
- Modify: `src/content-store/types.ts`
- Modify: `src/content-store/memory-store.ts`
- Modify: `src/content-store/d1-store.ts`
- Modify: `db/migrations/0001_initial.sql`
- Test: `tests/content-store/memory-store.test.ts`
- Test: `tests/content-store/d1-store.test.ts`

- [ ] **Step 1: Write failing memory-store media test**

Add to `tests/content-store/memory-store.test.ts`:

```ts
it('saves, lists, and updates media asset metadata', async () => {
  const store = new MemoryContentStore();
  const variants = {
    thumb: { r2Key: 'thumb.webp', url: '/api/media/asset-1/thumb', width: 360, height: 240, bytes: 12000, contentType: 'image/webp' as const },
    card: { r2Key: 'card.webp', url: '/api/media/asset-1/card', width: 900, height: 600, bytes: 48000, contentType: 'image/webp' as const },
    large: { r2Key: 'large.webp', url: '/api/media/asset-1/large', width: 1200, height: 800, bytes: 92000, contentType: 'image/webp' as const },
  };

  const saved = await store.saveMediaAsset({
    siteId: 'joes-plumbing',
    assetId: 'asset-1',
    filename: 'van.webp',
    altText: "Joe's Plumbing van",
    caption: 'Service van',
    width: 1200,
    height: 800,
    variants,
  });
  const updated = await store.updateMediaAssetMetadata({
    siteId: 'joes-plumbing',
    assetId: 'asset-1',
    altText: 'Updated alt',
    caption: 'Updated caption',
  });

  expect(saved.contentType).toBe('image/webp');
  expect(updated.altText).toBe('Updated alt');
  expect(await store.listMediaAssets('joes-plumbing')).toEqual([
    expect.objectContaining({ assetId: 'asset-1', caption: 'Updated caption', variants }),
  ]);
});
```

- [ ] **Step 2: Run the memory-store test and verify it fails**

Run: `npm test -- tests/content-store/memory-store.test.ts`

Expected: failure because media methods do not exist.

- [ ] **Step 3: Add media methods to store types**

Modify `src/content-store/types.ts`:

```ts
import type { MediaAsset, SaveMediaAssetInput, UpdateMediaAssetInput } from '../media/types';
```

Add to `ContentStore`:

```ts
saveMediaAsset(input: SaveMediaAssetInput): Promise<MediaAsset>;
listMediaAssets(siteId: string): Promise<MediaAsset[]>;
updateMediaAssetMetadata(input: UpdateMediaAssetInput): Promise<MediaAsset>;
```

- [ ] **Step 4: Implement memory-store media metadata**

Modify `src/content-store/memory-store.ts`:

```ts
function mediaKey(siteId: string, assetId: string): string {
  return `${siteId}:${assetId}`;
}

function cloneMediaAsset(asset: MediaAsset): MediaAsset {
  return structuredClone(asset);
}
```

Add a private map:

```ts
private mediaAssets = new Map<string, MediaAsset>();
```

Add methods:

```ts
async saveMediaAsset(input: SaveMediaAssetInput): Promise<MediaAsset> {
  const now = new Date().toISOString();
  const asset: MediaAsset = {
    ...input,
    assetId: input.assetId ?? crypto.randomUUID(),
    caption: input.caption ?? '',
    contentType: 'image/webp',
    createdAt: now,
    updatedAt: now,
  };
  this.mediaAssets.set(mediaKey(asset.siteId, asset.assetId), cloneMediaAsset(asset));
  return cloneMediaAsset(asset);
}

async listMediaAssets(siteId: string): Promise<MediaAsset[]> {
  return [...this.mediaAssets.values()]
    .filter((asset) => asset.siteId === siteId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(cloneMediaAsset);
}

async updateMediaAssetMetadata(input: UpdateMediaAssetInput): Promise<MediaAsset> {
  const key = mediaKey(input.siteId, input.assetId);
  const existing = this.mediaAssets.get(key);
  if (!existing) {
    throw new Error(`Media asset not found for ${input.siteId}/${input.assetId}`);
  }
  const updated: MediaAsset = {
    ...existing,
    altText: input.altText,
    caption: input.caption,
    updatedAt: new Date().toISOString(),
  };
  this.mediaAssets.set(key, cloneMediaAsset(updated));
  return cloneMediaAsset(updated);
}
```

- [ ] **Step 5: Run memory-store test and verify it passes**

Run: `npm test -- tests/content-store/memory-store.test.ts`

Expected: all memory-store tests pass.

- [ ] **Step 6: Write failing D1 media test**

Add this test to `tests/content-store/d1-store.test.ts`:

```ts
it('saves, lists, and updates media asset metadata', async () => {
  const store = new D1ContentStore(new FakeD1Database() as unknown as D1Database);
  const variants = {
    thumb: { r2Key: 'thumb.webp', url: '/api/media/asset-1/thumb', width: 360, height: 240, bytes: 12000, contentType: 'image/webp' as const },
    card: { r2Key: 'card.webp', url: '/api/media/asset-1/card', width: 900, height: 600, bytes: 48000, contentType: 'image/webp' as const },
    large: { r2Key: 'large.webp', url: '/api/media/asset-1/large', width: 1200, height: 800, bytes: 92000, contentType: 'image/webp' as const },
  };

  await store.saveMediaAsset({
    siteId: 'joes-plumbing',
    assetId: 'asset-1',
    filename: 'van.webp',
    altText: "Joe's Plumbing van",
    caption: 'Service van',
    width: 1200,
    height: 800,
    variants,
  });

  const updated = await store.updateMediaAssetMetadata({
    siteId: 'joes-plumbing',
    assetId: 'asset-1',
    altText: 'Updated alt',
    caption: 'Updated caption',
  });

  expect(updated.altText).toBe('Updated alt');
  expect(await store.listMediaAssets('joes-plumbing')).toEqual([
    expect.objectContaining({ assetId: 'asset-1', caption: 'Updated caption', variants }),
  ]);
});
```

Extend `FakeD1Statement.run()` with:

```ts
if (this.sql.includes('INSERT OR REPLACE INTO media_assets')) {
  const [siteId, assetId, filename, contentType, width, height, variantsJson, altText, caption, createdAt, updatedAt] = this.bindings;
  this.rows.set(`media:${siteId}:${assetId}`, {
    site_id: siteId,
    asset_id: assetId,
    filename,
    content_type: contentType,
    width,
    height,
    variants_json: variantsJson,
    alt_text: altText,
    caption,
    created_at: createdAt,
    updated_at: updatedAt,
  });
  return;
}

if (this.sql.includes('UPDATE media_assets')) {
  const [altText, caption, updatedAt, siteId, assetId] = this.bindings;
  const key = `media:${siteId}:${assetId}`;
  const existing = this.rows.get(key);
  if (existing) {
    this.rows.set(key, { ...existing, alt_text: altText, caption, updated_at: updatedAt });
  }
  return;
}
```

Extend `FakeD1Statement.all()` before the existing page-region branch:

```ts
if (this.sql.includes('FROM media_assets')) {
  const [siteId] = this.bindings;
  return {
    results: [...this.rows.values()]
      .filter((row) => row.site_id === siteId && row.asset_id)
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))),
  };
}
```

- [ ] **Step 7: Update D1 migration and store**

Modify `db/migrations/0001_initial.sql`:

```sql
CREATE TABLE media_assets (
  site_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  variants_json TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  caption TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, asset_id)
);
```

Add this parser to `src/content-store/d1-store.ts`:

```ts
function rowToMediaAsset(row: Record<string, unknown>): MediaAsset {
  return {
    siteId: String(row.site_id),
    assetId: String(row.asset_id),
    filename: String(row.filename),
    contentType: 'image/webp',
    width: Number(row.width),
    height: Number(row.height),
    variants: JSON.parse(String(row.variants_json)) as MediaVariantManifest,
    altText: String(row.alt_text),
    caption: String(row.caption),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
```

Add D1 methods with this shape:

```ts
async saveMediaAsset(input: SaveMediaAssetInput): Promise<MediaAsset> {
  const createdAt = now();
  const assetId = input.assetId ?? crypto.randomUUID();
  await this.db
    .prepare(
      `INSERT OR REPLACE INTO media_assets
        (site_id, asset_id, filename, content_type, width, height, variants_json, alt_text, caption, created_at, updated_at)
      VALUES (?, ?, ?, 'image/webp', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(input.siteId, assetId, input.filename, input.width, input.height, JSON.stringify(input.variants), input.altText, input.caption ?? '', createdAt, createdAt)
    .run();
  return {
    ...input,
    assetId,
    caption: input.caption ?? '',
    contentType: 'image/webp',
    createdAt,
    updatedAt: createdAt,
  };
}

async listMediaAssets(siteId: string): Promise<MediaAsset[]> {
  const result = await this.db
    .prepare(`SELECT * FROM media_assets WHERE site_id = ? ORDER BY created_at DESC`)
    .bind(siteId)
    .all<Record<string, unknown>>();
  return result.results.map(rowToMediaAsset);
}

async updateMediaAssetMetadata(input: UpdateMediaAssetInput): Promise<MediaAsset> {
  const updatedAt = now();
  await this.db
    .prepare(`UPDATE media_assets SET alt_text = ?, caption = ?, updated_at = ? WHERE site_id = ? AND asset_id = ?`)
    .bind(input.altText, input.caption, updatedAt, input.siteId, input.assetId)
    .run();
  const asset = (await this.listMediaAssets(input.siteId)).find((candidate) => candidate.assetId === input.assetId);
  if (!asset) throw new Error(`Media asset not found for ${input.siteId}/${input.assetId}`);
  return asset;
}
```

- [ ] **Step 8: Run content-store tests**

Run: `npm test -- tests/content-store/memory-store.test.ts tests/content-store/d1-store.test.ts`

Expected: all content-store tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/content-store/types.ts src/content-store/memory-store.ts src/content-store/d1-store.ts db/migrations/0001_initial.sql tests/content-store/memory-store.test.ts tests/content-store/d1-store.test.ts
git commit -m "feat: store media asset metadata"
```

## Task 3: Media API and Blob Storage

**Files:**
- Create: `src/media/storage.ts`
- Modify: `src/worker/routes.ts`
- Modify: `src/worker/index.ts`
- Test: `tests/media/storage.test.ts`
- Test: `tests/worker/routes.test.ts`

- [ ] **Step 1: Write failing storage adapter test**

Create `tests/media/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoryMediaStorage } from '../../src/media/storage';

describe('MemoryMediaStorage', () => {
  it('stores and reads optimized variant blobs by key', async () => {
    const storage = new MemoryMediaStorage();
    const body = new Blob(['webp-bytes'], { type: 'image/webp' });

    await storage.put('sites/demo/media/asset/thumb.webp', body);
    const stored = await storage.get('sites/demo/media/asset/thumb.webp');

    expect(stored?.contentType).toBe('image/webp');
    expect(await stored?.body.text()).toBe('webp-bytes');
  });
});
```

- [ ] **Step 2: Implement storage adapters**

Create `src/media/storage.ts`:

```ts
export interface StoredMediaObject {
  body: Blob;
  contentType: string;
}

export interface MediaStorage {
  put(key: string, body: Blob): Promise<void>;
  get(key: string): Promise<StoredMediaObject | null>;
}

export class MemoryMediaStorage implements MediaStorage {
  private objects = new Map<string, StoredMediaObject>();

  async put(key: string, body: Blob): Promise<void> {
    this.objects.set(key, { body, contentType: body.type || 'application/octet-stream' });
  }

  async get(key: string): Promise<StoredMediaObject | null> {
    return this.objects.get(key) ?? null;
  }
}

export class R2MediaStorage implements MediaStorage {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, body: Blob): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType: body.type || 'image/webp' },
    });
  }

  async get(key: string): Promise<StoredMediaObject | null> {
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }
    return {
      body: await object.blob(),
      contentType: object.httpMetadata?.contentType ?? 'image/webp',
    };
  }
}
```

- [ ] **Step 3: Run storage test**

Run: `npm test -- tests/media/storage.test.ts`

Expected: storage test passes.

- [ ] **Step 4: Write failing media route tests**

Add to `tests/worker/routes.test.ts`:

```ts
it('creates and lists media assets through the API', async () => {
  const store = new MemoryContentStore();
  const storage = new MemoryMediaStorage();
  const form = new FormData();
  form.set('siteId', 'joes-plumbing');
  form.set('filename', 'van.webp');
  form.set('altText', "Joe's Plumbing van");
  form.set('caption', 'Service van');
  form.set('width', '1200');
  form.set('height', '800');
  form.set('bytesByVariant', JSON.stringify({ thumb: 10, card: 20, large: 30 }));
  form.set('thumb', new Blob(['thumb'], { type: 'image/webp' }));
  form.set('card', new Blob(['card'], { type: 'image/webp' }));
  form.set('large', new Blob(['large'], { type: 'image/webp' }));

  const createResponse = await handleApiRequest(
    new Request('https://cms.test/api/media', { method: 'POST', body: form }),
    store,
    storage,
  );
  const listResponse = await handleApiRequest(
    new Request('https://cms.test/api/media?siteId=joes-plumbing'),
    store,
    storage,
  );

  expect(createResponse.status).toBe(200);
  await expect(listResponse.json()).resolves.toMatchObject({
    assets: [expect.objectContaining({ filename: 'van.webp', altText: "Joe's Plumbing van" })],
  });
});
```

- [ ] **Step 5: Implement media routes**

Change `handleApiRequest` signature in `src/worker/routes.ts`:

```ts
export async function handleApiRequest(
  request: Request,
  store: ContentStore,
  mediaStorage?: MediaStorage,
): Promise<Response> {
```

Add:

```ts
if (url.pathname === '/api/media') {
  if (request.method === 'GET') {
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('Missing siteId query parameter');
    return jsonResponse({ assets: await store.listMediaAssets(siteId) });
  }

  if (request.method === 'POST') {
    if (!mediaStorage) return errorResponse('Media storage is not configured', 500);
    const form = await request.formData();
    const siteId = String(form.get('siteId') ?? '');
    const assetId = crypto.randomUUID();
    const bytesByVariant = JSON.parse(String(form.get('bytesByVariant') ?? '{}'));
    const width = Number(form.get('width'));
    const height = Number(form.get('height'));
    const variants = createMediaVariantManifest({ siteId, assetId, sourceSize: { width, height }, bytesByVariant });

    for (const variantId of ['thumb', 'card', 'large'] as const) {
      const blob = form.get(variantId);
      if (!(blob instanceof Blob)) return errorResponse(`Missing ${variantId} image variant`);
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
```

Add metadata updates below the `/api/media` block:

```ts
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
```

Add variant serving below the metadata update route:

```ts
const mediaVariantMatch = url.pathname.match(/^\/api\/media\/([^/]+)\/(thumb|card|large)$/);
if (mediaVariantMatch && request.method === 'GET') {
  if (!mediaStorage) return errorResponse('Media storage is not configured', 500);
  const siteId = url.searchParams.get('siteId') ?? 'joes-plumbing';
  const [asset] = (await store.listMediaAssets(siteId)).filter((candidate) => candidate.assetId === mediaVariantMatch[1]);
  if (!asset) return errorResponse('Media asset not found', 404);
  const variant = asset.variants[mediaVariantMatch[2] as 'thumb' | 'card' | 'large'];
  const object = await mediaStorage.get(variant.r2Key);
  if (!object) return errorResponse('Media variant not found', 404);
  return new Response(object.body, {
    headers: {
      'content-type': object.contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
```

- [ ] **Step 6: Wire Worker storage**

Modify `src/worker/index.ts`:

```ts
import { R2MediaStorage } from '../media/storage';
```

Pass storage:

```ts
return handleApiRequest(request, new D1ContentStore(env.CLASTRO_DB), new R2MediaStorage(env.CLASTRO_MEDIA));
```

- [ ] **Step 7: Run route tests**

Run: `npm test -- tests/media/storage.test.ts tests/worker/routes.test.ts`

Expected: all route and storage tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/media/storage.ts src/worker/routes.ts src/worker/index.ts tests/media/storage.test.ts tests/worker/routes.test.ts
git commit -m "feat: add media API routes"
```

## Task 4: CMS Media View

**Files:**
- Modify: `src/cms/sample-content.ts`
- Modify: `src/cms/view-model.ts`
- Modify: `src/pages/cms.astro`
- Modify: `src/styles/cms.css`
- Test: `tests/cms/view-model.test.ts`

- [ ] **Step 1: Write failing CMS view-model test**

Add to `tests/cms/view-model.test.ts`:

```ts
it('creates a media mode with sample assets', () => {
  const model = createCmsViewModel(plumberContract, plumberItems, { mode: 'media' }, plumberPages, plumberMediaAssets);

  expect(model.activeMode).toBe('media');
  expect(model.mediaAssets).toEqual([
    expect.objectContaining({
      filename: 'joes-plumbing-van.webp',
      altText: "Joe's Plumbing van beside pipework",
    }),
  ]);
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npm test -- tests/cms/view-model.test.ts`

Expected: failure because media mode does not exist.

- [ ] **Step 3: Add sample media and view model support**

Export `plumberMediaAssets` from `src/cms/sample-content.ts` with one sample asset using the existing van preview path for demo display.

Add `activeMode: 'collections' | 'pages' | 'media'` and `mediaAssets` to `CmsViewModel`.

- [ ] **Step 4: Render Media navigation and screen**

Modify `src/pages/cms.astro`:

```astro
<nav class="cms-nav" aria-label="Media">
  <p class="cms-kicker">Assets</p>
  <a class:list={['cms-nav-item', { 'is-active': model.activeMode === 'media' }]} href="/cms?view=media">
    <span>Media</span>
    <small>{model.mediaAssets.length}</small>
  </a>
</nav>
```

Render this Media branch where the editor content currently branches between pages and collections:

```astro
{model.activeMode === 'media' && (
  <form class="cms-form cms-media-form" data-media-form>
    <section class="cms-upload-panel">
      <div>
        <p class="cms-kicker">Optimized upload</p>
        <h3>Add website image</h3>
        <p>JPEG, PNG, or WebP images are converted into optimized WebP variants before storage.</p>
      </div>
      <label class="cms-field" for="media-upload">
        <span>Image file</span>
        <input class="cms-input" id="media-upload" type="file" accept="image/jpeg,image/png,image/webp" data-media-upload />
      </label>
      <label class="cms-field" for="media-alt">
        <span>Alt text <em>Required</em></span>
        <input class="cms-input" id="media-alt" data-media-alt />
      </label>
      <label class="cms-field" for="media-caption">
        <span>Caption</span>
        <input class="cms-input" id="media-caption" data-media-caption />
      </label>
      <button class="cms-button" type="button" data-media-upload-button>Upload optimized image</button>
    </section>

    <section class="cms-field-section">
      <div class="cms-subheading">
        <p class="cms-kicker">Library</p>
        <h3>Website images</h3>
      </div>
      <div class="cms-media-grid">
        {model.mediaAssets.map((asset) => (
          <article class="cms-media-card" data-media-asset={asset.assetId}>
            <img class="cms-media-preview" src={asset.previewUrl} alt={asset.altText} width={asset.previewWidth} height={asset.previewHeight} />
            <label class="cms-field">
              <span>Alt text</span>
              <input class="cms-input" value={asset.altText} data-media-asset-alt={asset.assetId} />
            </label>
            <label class="cms-field">
              <span>Caption</span>
              <input class="cms-input" value={asset.caption} data-media-asset-caption={asset.assetId} />
            </label>
            <dl class="cms-media-meta">
              <div><dt>Size</dt><dd>{asset.width} x {asset.height}</dd></div>
              <div><dt>Large</dt><dd>{asset.largeBytesLabel}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  </form>
)}
```

- [ ] **Step 5: Style Media screen**

Add these rules to `src/styles/cms.css`:

```css
.cms-media-form {
  display: grid;
  gap: 18px;
}

.cms-upload-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 0.75fr);
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--cms-line);
  border-radius: var(--cms-radius);
  background: var(--cms-panel);
}

.cms-media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.cms-media-card {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--cms-line);
  border-radius: var(--cms-radius);
  background: var(--cms-panel);
}

.cms-media-preview {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border: 1px solid var(--cms-line);
  border-radius: var(--cms-radius);
  background: #eef2ee;
}

.cms-media-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

.cms-media-meta div {
  display: grid;
  gap: 2px;
}

.cms-media-meta dt {
  color: var(--cms-muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.cms-media-meta dd {
  margin: 0;
  color: var(--cms-ink);
  font-size: 0.86rem;
}
```

- [ ] **Step 6: Run CMS tests**

Run: `npm test -- tests/cms/view-model.test.ts`

Expected: CMS view-model tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/cms/sample-content.ts src/cms/view-model.ts src/pages/cms.astro src/styles/cms.css tests/cms/view-model.test.ts
git commit -m "feat: add CMS media screen"
```

## Task 5: Browser Optimizer and Upload Client

**Files:**
- Create: `src/media/browser-optimizer.ts`
- Modify: `src/cms/client.ts`
- Test: `tests/media/variants.test.ts`

- [ ] **Step 1: Add optimizer boundary tests**

Add tests for pure helper exports in `tests/media/variants.test.ts` if any helper is shared, such as accepted MIME type checks:

```ts
import { isSupportedImageType } from '../../src/media/variants';

it('accepts jpeg, png, and webp image uploads only', () => {
  expect(isSupportedImageType('image/jpeg')).toBe(true);
  expect(isSupportedImageType('image/png')).toBe(true);
  expect(isSupportedImageType('image/webp')).toBe(true);
  expect(isSupportedImageType('image/gif')).toBe(false);
});
```

- [ ] **Step 2: Implement browser optimizer**

Create `src/media/browser-optimizer.ts`:

```ts
import { planImageVariants } from './variants';
import type { MediaVariantId } from './types';

export interface OptimizedUpload {
  filename: string;
  width: number;
  height: number;
  blobs: Record<MediaVariantId, Blob>;
  bytesByVariant: Record<MediaVariantId, number>;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to convert image to WebP'));
    }, 'image/webp', quality);
  });
}

export async function optimizeImageFile(file: File): Promise<OptimizedUpload> {
  const bitmap = await createImageBitmap(file);
  const variants = planImageVariants({ width: bitmap.width, height: bitmap.height });
  const blobs = {} as Record<MediaVariantId, Blob>;
  const bytesByVariant = {} as Record<MediaVariantId, number>;

  for (const variant of variants) {
    const canvas = document.createElement('canvas');
    canvas.width = variant.width;
    canvas.height = variant.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare image canvas');
    context.drawImage(bitmap, 0, 0, variant.width, variant.height);
    const blob = await canvasToBlob(canvas, variant.quality);
    blobs[variant.id] = blob;
    bytesByVariant[variant.id] = blob.size;
  }

  return {
    filename: file.name.replace(/\.[^.]+$/, '.webp'),
    width: bitmap.width,
    height: bitmap.height,
    blobs,
    bytesByVariant,
  };
}
```

- [ ] **Step 3: Wire CMS upload form**

Modify `src/cms/client.ts`:

```ts
const mediaUploadInput = document.querySelector<HTMLInputElement>('[data-media-upload]');
const mediaUploadButton = document.querySelector<HTMLButtonElement>('[data-media-upload-button]');
const mediaAltInput = document.querySelector<HTMLInputElement>('[data-media-alt]');
const mediaCaptionInput = document.querySelector<HTMLInputElement>('[data-media-caption]');

async function uploadSelectedMedia(): Promise<void> {
  const file = mediaUploadInput?.files?.[0];
  if (!file) {
    setStatus('Choose an image', 'Select a JPEG, PNG, or WebP image first.', true);
    return;
  }
  if (!mediaAltInput?.value.trim()) {
    setStatus('Alt text required', 'Add alt text before uploading this image.', true);
    return;
  }

  setStatus('Optimizing image', 'Creating WebP website variants in the browser.', true);
  const optimized = await optimizeImageFile(file);
  const form = new FormData();
  form.set('siteId', 'joes-plumbing');
  form.set('filename', optimized.filename);
  form.set('altText', mediaAltInput.value.trim());
  form.set('caption', mediaCaptionInput?.value.trim() ?? '');
  form.set('width', String(optimized.width));
  form.set('height', String(optimized.height));
  form.set('bytesByVariant', JSON.stringify(optimized.bytesByVariant));
  form.set('thumb', optimized.blobs.thumb);
  form.set('card', optimized.blobs.card);
  form.set('large', optimized.blobs.large);

  const response = await fetch('/api/media', { method: 'POST', body: form });
  if (!response.ok) {
    setStatus('Upload failed', await response.text(), true);
    return;
  }
  setStatus('Media saved', 'The optimized image is now in the media library.', false);
  window.location.href = '/cms?view=media';
}

mediaUploadButton?.addEventListener('click', () => {
  void uploadSelectedMedia().catch((error) => {
    setStatus('Upload failed', error instanceof Error ? error.message : 'Unable to upload media.', true);
  });
});
```

Add the import at the top:

```ts
import { optimizeImageFile } from '../media/browser-optimizer';
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
npm test -- tests/media/variants.test.ts
npx tsc --noEmit
```

Expected: tests and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add src/media/browser-optimizer.ts src/media/variants.ts src/cms/client.ts tests/media/variants.test.ts
git commit -m "feat: optimize media uploads in browser"
```

## Task 6: Verification and Browser Pass

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected:

- TypeScript exits 0.
- Vitest reports all tests passing.
- Astro build exits 0.

- [ ] **Step 2: Browser verify CMS media screen**

Open `http://127.0.0.1:4322/cms?view=media`.

Verify:

- Media navigation item is visible and active.
- Upload panel is visible.
- Sample media asset preview renders.
- Alt text and caption fields are visible.
- No console errors are present.

- [ ] **Step 3: Browser verify optimizer with a generated image**

Use a generated `File` in the browser to verify the optimizer can produce WebP variants without retaining the original:

```js
const canvas = document.createElement('canvas');
canvas.width = 1200;
canvas.height = 800;
const context = canvas.getContext('2d');
context.fillStyle = '#245f55';
context.fillRect(0, 0, 1200, 800);
const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
const file = new File([blob], 'generated-test.jpg', { type: 'image/jpeg' });
const { optimizeImageFile } = await import('/src/media/browser-optimizer.ts');
const optimized = await optimizeImageFile(file);
return {
  filename: optimized.filename,
  width: optimized.width,
  height: optimized.height,
  variantTypes: Object.fromEntries(Object.entries(optimized.blobs).map(([key, value]) => [key, value.type])),
  variantBytes: optimized.bytesByVariant,
};
```

Expected: `filename` ends with `.webp`, all `variantTypes` are `image/webp`, and each `variantBytes` value is greater than zero.

- [ ] **Step 4: Final commit if verification required fixes**

If verification required fixes, commit them:

```bash
git add .
git commit -m "fix: verify media library flow"
```

- [ ] **Step 5: Push branch**

```bash
git push
```

Expected: `feat/cms-structured-editor` pushes to `origin`.
