# Media-Connected Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect collection `image`, `sortableGallery`, and `richText` fields to the Clastro media library so blogs, services, products, and procedures can share one reusable image-editing model.

**Architecture:** Media field values are normalized through pure TypeScript helpers before the CMS view model renders them. Collection item editors resolve media asset IDs into preview data, then the browser client reuses the existing media optimizer/API to upload, select, reorder, insert, and autosave collection draft values.

**Tech Stack:** Astro, TypeScript, Vitest, Cloudflare Workers-style API routes, browser Canvas/WebP upload optimizer.

---

## File Structure

- Create `src/cms/media-field-values.ts`: Pure helpers for image references, gallery references, and rich-text media markers.
- Create `tests/cms/media-field-values.test.ts`: Unit tests for normalization, gallery operations, and rich-text insertion markers.
- Modify `src/contracts/examples/plumber.ts`: Add a `gallery` `sortableGallery` field to services.
- Modify `src/cms/sample-content.ts`: Convert Joe's Plumbing `heroImage` values from file paths to media references and add sample service galleries.
- Modify `src/cms/view-model.ts`: Resolve media fields to preview-ready data and expose media library choices to the CMS page.
- Modify `tests/cms/view-model.test.ts`: Cover image and gallery field resolution.
- Modify `src/pages/cms.astro`: Render image fields, gallery fields, rich-text insertion controls, media library data, and selected draft overlays.
- Modify `src/cms/client.ts`: Add reusable field upload/select/autosave behavior and rich-text image insertion.
- Modify `src/styles/cms.css`: Style media field previews, gallery thumbnails, picker controls, and rich-text toolbars.

## Task 1: Media Field Value Helpers

**Files:**
- Create: `src/cms/media-field-values.ts`
- Test: `tests/cms/media-field-values.test.ts`

- [ ] **Step 1: Write failing media field helper tests**

Create `tests/cms/media-field-values.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addGalleryAsset,
  createRichTextImageMarker,
  insertRichTextImageMarker,
  moveGalleryAsset,
  normalizeGalleryFieldValue,
  normalizeImageFieldValue,
  removeGalleryAsset,
  setGalleryHero,
} from '../../src/cms/media-field-values';

describe('media field values', () => {
  it('normalizes image fields from strings and objects', () => {
    expect(normalizeImageFieldValue('joes-plumbing-van')).toEqual({
      assetId: 'joes-plumbing-van',
      role: 'hero',
    });
    expect(normalizeImageFieldValue({ assetId: 'asset-2', role: 'thumbnail' })).toEqual({
      assetId: 'asset-2',
      role: 'thumbnail',
    });
    expect(normalizeImageFieldValue('')).toBeNull();
  });

  it('normalizes gallery fields with unique ordered asset ids and a valid hero', () => {
    expect(
      normalizeGalleryFieldValue({
        heroAssetId: 'asset-2',
        assetIds: ['asset-1', 'asset-2', 'asset-1', '', 'asset-3'],
      }),
    ).toEqual({
      heroAssetId: 'asset-2',
      assetIds: ['asset-1', 'asset-2', 'asset-3'],
    });
    expect(normalizeGalleryFieldValue({ heroAssetId: 'missing', assetIds: ['asset-1'] })).toEqual({
      heroAssetId: 'asset-1',
      assetIds: ['asset-1'],
    });
  });

  it('adds, removes, moves, and selects gallery assets', () => {
    const gallery = normalizeGalleryFieldValue({ heroAssetId: 'asset-1', assetIds: ['asset-1', 'asset-2'] });

    expect(addGalleryAsset(gallery, 'asset-3')).toEqual({
      heroAssetId: 'asset-1',
      assetIds: ['asset-1', 'asset-2', 'asset-3'],
    });
    expect(moveGalleryAsset(gallery, 'asset-2', -1)).toEqual({
      heroAssetId: 'asset-1',
      assetIds: ['asset-2', 'asset-1'],
    });
    expect(setGalleryHero(gallery, 'asset-2')).toEqual({
      heroAssetId: 'asset-2',
      assetIds: ['asset-1', 'asset-2'],
    });
    expect(removeGalleryAsset(gallery, 'asset-1')).toEqual({
      heroAssetId: 'asset-2',
      assetIds: ['asset-2'],
    });
  });

  it('creates and inserts rich text media markers', () => {
    const marker = createRichTextImageMarker('asset-1', 'Pipe diagram');

    expect(marker).toBe('[media:image assetId="asset-1" caption="Pipe diagram"]');
    expect(insertRichTextImageMarker('Before after', marker, 7)).toBe('Before\\n\\n[media:image assetId="asset-1" caption="Pipe diagram"]\\n\\nafter');
  });
});
```

- [ ] **Step 2: Run helper tests and verify they fail**

Run:

```bash
npm test -- tests/cms/media-field-values.test.ts
```

Expected: fail because `src/cms/media-field-values.ts` does not exist.

- [ ] **Step 3: Implement media field helper module**

Create `src/cms/media-field-values.ts`:

```ts
export interface ImageFieldValue {
  assetId: string;
  role: string;
}

export interface GalleryFieldValue {
  heroAssetId: string | null;
  assetIds: string[];
}

function cleanAssetId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueAssetIds(values: unknown[]): string[] {
  return [...new Set(values.map(cleanAssetId).filter(Boolean))];
}

function escapeMarkerValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function normalizeImageFieldValue(value: unknown): ImageFieldValue | null {
  if (typeof value === 'string') {
    const assetId = cleanAssetId(value);
    return assetId ? { assetId, role: 'hero' } : null;
  }

  if (value && typeof value === 'object' && !Array.isArray(value) && 'assetId' in value) {
    const candidate = value as { assetId?: unknown; role?: unknown };
    const assetId = cleanAssetId(candidate.assetId);
    if (!assetId) return null;
    return {
      assetId,
      role: cleanAssetId(candidate.role) || 'hero',
    };
  }

  return null;
}

export function normalizeGalleryFieldValue(value: unknown): GalleryFieldValue {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as { assetIds?: unknown; heroAssetId?: unknown }
    : {};
  const assetIds = Array.isArray(input.assetIds) ? uniqueAssetIds(input.assetIds) : [];
  const requestedHero = cleanAssetId(input.heroAssetId);
  return {
    heroAssetId: assetIds.includes(requestedHero) ? requestedHero : assetIds[0] ?? null,
    assetIds,
  };
}

export function addGalleryAsset(value: GalleryFieldValue, assetId: string): GalleryFieldValue {
  return normalizeGalleryFieldValue({
    heroAssetId: value.heroAssetId,
    assetIds: [...value.assetIds, assetId],
  });
}

export function removeGalleryAsset(value: GalleryFieldValue, assetId: string): GalleryFieldValue {
  return normalizeGalleryFieldValue({
    heroAssetId: value.heroAssetId === assetId ? null : value.heroAssetId,
    assetIds: value.assetIds.filter((candidate) => candidate !== assetId),
  });
}

export function moveGalleryAsset(value: GalleryFieldValue, assetId: string, direction: -1 | 1): GalleryFieldValue {
  const index = value.assetIds.indexOf(assetId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= value.assetIds.length) {
    return normalizeGalleryFieldValue(value);
  }
  const assetIds = [...value.assetIds];
  const [asset] = assetIds.splice(index, 1);
  assetIds.splice(nextIndex, 0, asset);
  return normalizeGalleryFieldValue({ heroAssetId: value.heroAssetId, assetIds });
}

export function setGalleryHero(value: GalleryFieldValue, assetId: string): GalleryFieldValue {
  return normalizeGalleryFieldValue({
    heroAssetId: assetId,
    assetIds: value.assetIds,
  });
}

export function createRichTextImageMarker(assetId: string, caption = ''): string {
  const captionPart = caption.trim() ? ` caption="${escapeMarkerValue(caption.trim())}"` : '';
  return `[media:image assetId="${escapeMarkerValue(assetId)}"${captionPart}]`;
}

export function insertRichTextImageMarker(value: string, marker: string, selectionStart: number): string {
  const safeIndex = Math.max(0, Math.min(selectionStart, value.length));
  const prefix = value.slice(0, safeIndex).trimEnd();
  const suffix = value.slice(safeIndex).trimStart();
  return `${prefix}\\n\\n${marker}\\n\\n${suffix}`.trim();
}
```

- [ ] **Step 4: Run helper tests and verify they pass**

Run:

```bash
npm test -- tests/cms/media-field-values.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit helper module**

Run:

```bash
git add src/cms/media-field-values.ts tests/cms/media-field-values.test.ts
git commit -m "feat: normalize CMS media field values"
```

## Task 2: Demo Contract and Sample Media References

**Files:**
- Modify: `src/contracts/examples/plumber.ts`
- Modify: `src/cms/sample-content.ts`
- Test: `tests/contracts/content-contract.test.ts`

- [ ] **Step 1: Write failing contract test for service gallery**

Modify `tests/contracts/content-contract.test.ts` by extending the Joe's Plumbing expectations:

```ts
expect(services?.coreFields.map((field) => field.id)).toContain('gallery');
expect(services?.coreFields.find((field) => field.id === 'gallery')?.primitive).toBe('sortableGallery');
expect(blogPosts?.coreFields.find((field) => field.id === 'heroImage')?.primitive).toBe('image');
```

- [ ] **Step 2: Run contract tests and verify they fail**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: fail because the services collection has no `gallery` field.

- [ ] **Step 3: Add reusable gallery primitive to services**

Modify the `services.coreFields` array in `src/contracts/examples/plumber.ts`:

```ts
{ id: 'heroImage', label: 'Hero Image', primitive: 'image', required: false },
{ id: 'gallery', label: 'Image Gallery', primitive: 'sortableGallery', required: false },
{ id: 'seo', label: 'SEO Metadata', primitive: 'seoMetadata', required: true },
```

- [ ] **Step 4: Convert Joe's Plumbing sample item media values**

In `src/cms/sample-content.ts`, replace Joe's Plumbing `heroImage` file paths with media references:

```ts
heroImage: { assetId: 'joes-plumbing-van', role: 'hero' },
```

For each service item, add a gallery value:

```ts
gallery: {
  heroAssetId: 'joes-plumbing-van',
  assetIds: ['joes-plumbing-van'],
},
```

Keep existing titles, slugs, summaries, excerpts, dates, and SEO strings unchanged.

- [ ] **Step 5: Run contract tests and verify they pass**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: all contract tests pass.

- [ ] **Step 6: Commit contract/sample changes**

Run:

```bash
git add src/contracts/examples/plumber.ts src/cms/sample-content.ts tests/contracts/content-contract.test.ts
git commit -m "feat: add media gallery field to services"
```

## Task 3: View Model Media Resolution

**Files:**
- Modify: `src/cms/view-model.ts`
- Test: `tests/cms/view-model.test.ts`

- [ ] **Step 1: Write failing view-model tests**

Add tests to `tests/cms/view-model.test.ts`:

```ts
it('resolves image fields to media previews', () => {
  const model = createCmsViewModel(
    plumberContract,
    plumberItems,
    { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
    plumberPages,
    plumberMediaAssets,
  );

  const heroImage = model.activeItem?.fields.find((field) => field.id === 'heroImage');

  expect(heroImage?.primitive).toBe('image');
  expect(heroImage?.mediaAsset).toEqual(expect.objectContaining({
    assetId: 'joes-plumbing-van',
    altText: "Joe's Plumbing van beside pipework",
  }));
});

it('resolves sortable gallery fields to ordered media previews', () => {
  const model = createCmsViewModel(
    plumberContract,
    plumberItems,
    { selectedCollectionId: 'services', selectedItemId: 'emergency' },
    plumberPages,
    plumberMediaAssets,
  );

  const gallery = model.activeItem?.fields.find((field) => field.id === 'gallery');

  expect(gallery?.primitive).toBe('sortableGallery');
  expect(gallery?.gallery?.heroAssetId).toBe('joes-plumbing-van');
  expect(gallery?.gallery?.assets).toEqual([
    expect.objectContaining({ assetId: 'joes-plumbing-van' }),
  ]);
});
```

- [ ] **Step 2: Run view-model tests and verify they fail**

Run:

```bash
npm test -- tests/cms/view-model.test.ts
```

Expected: fail because `CmsFieldView` does not expose `mediaAsset` or `gallery`.

- [ ] **Step 3: Extend field view types**

In `src/cms/view-model.ts`, add:

```ts
import { normalizeGalleryFieldValue, normalizeImageFieldValue, type GalleryFieldValue, type ImageFieldValue } from './media-field-values';
```

Extend `CmsFieldView`:

```ts
export interface CmsFieldGalleryView {
  heroAssetId: string | null;
  assets: CmsMediaAssetView[];
  missingAssetIds: string[];
}

export interface CmsFieldView {
  id: string;
  label: string;
  primitive: string;
  required: boolean;
  value: string;
  rawValue: unknown;
  imageValue: ImageFieldValue | null;
  galleryValue: GalleryFieldValue | null;
  mediaAsset: CmsMediaAssetView | null;
  gallery: CmsFieldGalleryView | null;
}
```

- [ ] **Step 4: Resolve media fields inside `createFieldViews`**

Change `createFieldViews` to accept media asset views:

```ts
function findMediaAsset(mediaAssets: CmsMediaAssetView[], assetId: string): CmsMediaAssetView | null {
  return mediaAssets.find((asset) => asset.assetId === assetId) ?? null;
}

function createFieldViews(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
  mediaAssets: CmsMediaAssetView[],
): CmsFieldView[] {
  return fields.map((field) => {
    const rawValue = values[field.id];
    const imageValue = field.primitive === 'image' ? normalizeImageFieldValue(rawValue) : null;
    const galleryValue =
      field.primitive === 'imageGallery' || field.primitive === 'sortableGallery'
        ? normalizeGalleryFieldValue(rawValue)
        : null;
    const galleryAssets = galleryValue?.assetIds
      .map((assetId) => findMediaAsset(mediaAssets, assetId))
      .filter((asset): asset is CmsMediaAssetView => asset !== null) ?? [];

    return {
      id: field.id,
      label: field.label,
      primitive: field.primitive,
      required: field.required,
      value: stringifyValue(rawValue, field),
      rawValue,
      imageValue,
      galleryValue,
      mediaAsset: imageValue ? findMediaAsset(mediaAssets, imageValue.assetId) : null,
      gallery: galleryValue
        ? {
            heroAssetId: galleryValue.heroAssetId,
            assets: galleryAssets,
            missingAssetIds: galleryValue.assetIds.filter((assetId) => !findMediaAsset(mediaAssets, assetId)),
          }
        : null,
    };
  });
}
```

Update every `createFieldViews(...)` call to pass `mediaAssetViews`.

- [ ] **Step 5: Run view-model tests and verify they pass**

Run:

```bash
npm test -- tests/cms/view-model.test.ts
```

Expected: all view-model tests pass.

- [ ] **Step 6: Commit view-model resolution**

Run:

```bash
git add src/cms/view-model.ts tests/cms/view-model.test.ts
git commit -m "feat: resolve media assets in CMS fields"
```

## Task 4: Collection Draft Overlay for Reload Persistence

**Files:**
- Modify: `src/pages/cms.astro`
- Test: `tests/cms/view-model.test.ts`

- [ ] **Step 1: Add a selected draft overlay test**

Add to `tests/cms/view-model.test.ts`:

```ts
it('uses draft item values when the selected item has been autosaved', () => {
  const draftItems = plumberItems.map((item) =>
    item.itemId === 'shutOffWater'
      ? {
          ...item,
          values: {
            ...item.values,
            title: 'Draft shut off water title',
          },
          status: 'draft' as const,
        }
      : item,
  );
  const model = createCmsViewModel(
    plumberContract,
    draftItems,
    { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
    plumberPages,
    plumberMediaAssets,
  );

  expect(model.activeItem?.fields.find((field) => field.id === 'title')?.value).toBe('Draft shut off water title');
});
```

- [ ] **Step 2: Run test and verify it already passes**

Run:

```bash
npm test -- tests/cms/view-model.test.ts
```

Expected: pass. This proves the view model already accepts merged item arrays.

- [ ] **Step 3: Read selected draft in `cms.astro`**

In `src/pages/cms.astro`, after query params are read, add:

```ts
const selectedCollectionForDraft = selectedCollectionId ?? plumberContract.collections[0]?.id;
const selectedItemForDraft =
  selectedItemId ?? plumberItems.find((item) => item.collectionId === selectedCollectionForDraft)?.itemId;
const draftItem = selectedCollectionForDraft && selectedItemForDraft
  ? await demoContentStore.getDraftItem('joes-plumbing', selectedCollectionForDraft, selectedItemForDraft)
  : null;
const items = draftItem
  ? plumberItems.map((item) =>
      item.collectionId === draftItem.collectionId && item.itemId === draftItem.itemId
        ? {
            collectionId: draftItem.collectionId,
            itemId: draftItem.itemId,
            label: item.label,
            status: draftItem.status,
            values: draftItem.values,
            extraSections: draftItem.extraSections,
          }
        : item,
    )
  : plumberItems;
```

Change the view-model call from `plumberItems` to `items`.

Change the selection object passed to `createCmsViewModel` so the defaulted item ID is explicit:

```ts
{
  mode,
  selectedCollectionId,
  selectedItemId: selectedItemForDraft,
  selectedPageId,
}
```

- [ ] **Step 4: Run focused tests and build**

Run:

```bash
npm test -- tests/cms/view-model.test.ts
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit draft overlay**

Run:

```bash
git add src/pages/cms.astro tests/cms/view-model.test.ts
git commit -m "feat: render selected collection drafts in CMS"
```

## Task 5: Render Reusable Media Field Editors

**Files:**
- Modify: `src/pages/cms.astro`
- Modify: `src/styles/cms.css`

- [ ] **Step 1: Add media library JSON to CMS root**

In `src/pages/cms.astro`, before the template, add:

```ts
const mediaLibraryJson = JSON.stringify(model.mediaAssets);
```

Add attributes to the root element:

```astro
<main class="cms-shell" data-cms-root data-editor-mode={model.activeMode} data-media-library={mediaLibraryJson}>
```

- [ ] **Step 2: Add helper predicates for field rendering**

In `src/pages/cms.astro`, add:

```ts
function isImageField(field: CmsFieldView) {
  return field.primitive === 'image';
}

function isGalleryField(field: CmsFieldView) {
  return field.primitive === 'imageGallery' || field.primitive === 'sortableGallery';
}
```

- [ ] **Step 3: Replace core field rendering with primitive branches**

Inside `activeItem.fields.map`, render branches in this order:

```astro
{isImageField(field) ? (
  <div class="cms-field cms-media-field" data-cms-field-shell={field.id}>
    <span>
      {field.label}
      {field.required && <em>Required</em>}
    </span>
    <div class="cms-media-field-preview" data-image-preview={field.id}>
      {field.mediaAsset ? (
        <img src={field.mediaAsset.previewUrl} alt={field.mediaAsset.altText} width={field.mediaAsset.previewWidth} height={field.mediaAsset.previewHeight} />
      ) : (
        <strong>No image selected</strong>
      )}
    </div>
    <input type="hidden" name={`core-${field.id}`} value={JSON.stringify(field.imageValue)} data-field={field.id} data-media-image-field={field.id} />
    <select class="cms-input" data-media-select={field.id} aria-label={`Choose ${field.label}`}>
      <option value="">Choose from media</option>
      {model.mediaAssets.map((asset) => (
        <option value={asset.assetId} selected={asset.assetId === field.imageValue?.assetId}>{asset.filename}</option>
      ))}
    </select>
    <input class="cms-input" type="file" accept="image/jpeg,image/png,image/webp" data-media-field-upload={field.id} aria-label={`Upload ${field.label}`} />
    <div class="cms-button-row">
      <button class="cms-button cms-button-secondary" type="button" data-media-field-apply={field.id}>Choose</button>
      <button class="cms-button cms-button-secondary" type="button" data-media-field-upload-button={field.id}>Upload image</button>
      <button class="cms-button cms-button-secondary" type="button" data-media-field-remove={field.id}>Remove</button>
    </div>
    <small>{field.primitive}</small>
  </div>
) : isGalleryField(field) ? (
  <div class="cms-field cms-gallery-field" data-cms-field-shell={field.id}>
    <span>
      {field.label}
      {field.required && <em>Required</em>}
    </span>
    <input type="hidden" name={`core-${field.id}`} value={JSON.stringify(field.galleryValue)} data-field={field.id} data-media-gallery-field={field.id} />
    <div class="cms-gallery-grid" data-gallery-preview={field.id}>
      {field.gallery?.assets.map((asset) => (
        <article class:list={['cms-gallery-item', { 'is-hero': asset.assetId === field.gallery?.heroAssetId }]} data-gallery-asset={asset.assetId}>
          <img src={asset.previewUrl} alt={asset.altText} width={asset.previewWidth} height={asset.previewHeight} />
          <strong>{asset.filename}</strong>
        </article>
      ))}
    </div>
    <select class="cms-input" data-gallery-select={field.id} aria-label={`Add ${field.label} image`}>
      <option value="">Add from media</option>
      {model.mediaAssets.map((asset) => (
        <option value={asset.assetId}>{asset.filename}</option>
      ))}
    </select>
    <input class="cms-input" type="file" accept="image/jpeg,image/png,image/webp" data-gallery-upload={field.id} aria-label={`Upload ${field.label}`} />
    <div class="cms-button-row">
      <button class="cms-button cms-button-secondary" type="button" data-gallery-add={field.id}>Add</button>
      <button class="cms-button cms-button-secondary" type="button" data-gallery-upload-button={field.id}>Upload image</button>
      <button class="cms-button cms-button-secondary" type="button" data-gallery-move-up={field.id}>Move selected up</button>
      <button class="cms-button cms-button-secondary" type="button" data-gallery-move-down={field.id}>Move selected down</button>
      <button class="cms-button cms-button-secondary" type="button" data-gallery-set-hero={field.id}>Set selected as hero</button>
      <button class="cms-button cms-button-secondary" type="button" data-gallery-remove={field.id}>Remove selected</button>
    </div>
    <small>{field.primitive}</small>
  </div>
) : isMultiline(field) ? (
  <label class="cms-field" for={`core-${field.id}`}>
    <span>
      {field.label}
      {field.required && <em>Required</em>}
    </span>
    {field.primitive === 'richText' && (
      <div class="cms-richtext-toolbar">
        <select class="cms-input" data-richtext-media-select={field.id} aria-label={`Insert image into ${field.label}`}>
          <option value="">Insert image from media</option>
          {model.mediaAssets.map((asset) => (
            <option value={asset.assetId}>{asset.filename}</option>
          ))}
        </select>
        <button class="cms-button cms-button-secondary" type="button" data-richtext-insert-image={field.id}>Insert image</button>
      </div>
    )}
    <textarea
      class="cms-input cms-textarea"
      id={`core-${field.id}`}
      name={`core-${field.id}`}
      aria-label={field.label}
      data-field={field.id}
    >{field.value}</textarea>
    <small>{field.primitive}</small>
  </label>
) : (
  <label class="cms-field" for={`core-${field.id}`}>
    <span>
      {field.label}
      {field.required && <em>Required</em>}
    </span>
    <input
      class="cms-input"
      id={`core-${field.id}`}
      name={`core-${field.id}`}
      aria-label={field.label}
      value={field.value}
      data-field={field.id}
    />
    <small>{field.primitive}</small>
  </label>
)}
```

- [ ] **Step 4: Add rich-text insert image controls**

The multiline branch in Step 3 includes the rich-text toolbar. If the implementation keeps the current field map structure and patches only the textarea branch, the toolbar code must appear immediately before the textarea:

```astro
{field.primitive === 'richText' && (
  <div class="cms-richtext-toolbar">
    <select class="cms-input" data-richtext-media-select={field.id} aria-label={`Insert image into ${field.label}`}>
      <option value="">Insert image from media</option>
      {model.mediaAssets.map((asset) => (
        <option value={asset.assetId}>{asset.filename}</option>
      ))}
    </select>
    <button class="cms-button cms-button-secondary" type="button" data-richtext-insert-image={field.id}>Insert image</button>
  </div>
)}
```

- [ ] **Step 5: Add focused CSS for media fields**

Append to `src/styles/cms.css`:

```css
.cms-media-field,
.cms-gallery-field {
  align-items: stretch;
}

.cms-media-field-preview,
.cms-gallery-grid {
  border: 1px solid var(--cms-line);
  border-radius: var(--cms-radius);
  background: var(--cms-panel-soft);
}

.cms-media-field-preview {
  display: grid;
  min-height: 150px;
  place-items: center;
  overflow: hidden;
}

.cms-media-field-preview img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.cms-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  padding: 10px;
}

.cms-gallery-item {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--cms-line);
  border-radius: var(--cms-radius);
  background: var(--cms-panel);
}

.cms-gallery-item.is-selected {
  outline: 2px solid var(--cms-accent);
}

.cms-gallery-item.is-hero::after {
  content: "Hero";
  color: var(--cms-accent-strong);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.cms-gallery-item img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: calc(var(--cms-radius) - 2px);
}

.cms-button-row,
.cms-richtext-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

- [ ] **Step 6: Run build to catch Astro template errors**

Run:

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 7: Commit rendering changes**

Run:

```bash
git add src/pages/cms.astro src/styles/cms.css
git commit -m "feat: render media-connected CMS fields"
```

## Task 6: Client-Side Select, Upload, Gallery, and Rich Text Behavior

**Files:**
- Modify: `src/cms/client.ts`

- [ ] **Step 1: Add media library parsing and shared upload helper**

In `src/cms/client.ts`, add after constants:

```ts
const mediaLibrary = new Map<string, MediaAsset>();
const mediaLibraryJson = root?.dataset.mediaLibrary ?? '[]';
for (const asset of JSON.parse(mediaLibraryJson) as MediaAsset[]) {
  mediaLibrary.set(asset.assetId, asset);
}

async function uploadMediaFile(file: File, altText: string, caption = ''): Promise<MediaAsset> {
  const optimized = await optimizeImageFile(file);
  const form = new FormData();
  form.set('siteId', 'joes-plumbing');
  form.set('filename', optimized.filename);
  form.set('altText', altText);
  form.set('caption', caption);
  form.set('width', String(optimized.width));
  form.set('height', String(optimized.height));
  form.set('bytesByVariant', JSON.stringify(optimized.bytesByVariant));
  form.set('thumb', optimized.blobs.thumb);
  form.set('card', optimized.blobs.card);
  form.set('large', optimized.blobs.large);

  const response = await fetch('/api/media', { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const asset = await response.json() as MediaAsset;
  mediaLibrary.set(asset.assetId, asset);
  return asset;
}
```

Change `uploadSelectedMedia` to call `uploadMediaFile(file, mediaAltInput.value.trim(), mediaCaptionInput?.value.trim() ?? '')`.

- [ ] **Step 2: Add field serialization and autosave**

Add:

```ts
function parseFieldValue(input: HTMLInputElement | HTMLTextAreaElement): unknown {
  if (input.type === 'hidden') {
    try {
      return JSON.parse(input.value);
    } catch {
      return input.value;
    }
  }
  return input.value;
}

function serializeCollectionValues(): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]').forEach((field) => {
    values[field.dataset.field ?? field.name] = parseFieldValue(field);
  });
  return values;
}

function serializeExtraSections(): Array<{ type: string; values: Record<string, unknown> }> {
  const sections = new Map<string, Record<string, unknown>>();
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-extra-section][data-extra-field]').forEach((field) => {
    const sectionId = field.dataset.extraSection;
    const fieldId = field.dataset.extraField;
    if (!sectionId || !fieldId) return;
    const values = sections.get(sectionId) ?? {};
    values[fieldId] = parseFieldValue(field);
    sections.set(sectionId, values);
  });
  return [...sections.entries()].map(([type, values]) => ({ type, values }));
}

function getItemContext(): { collectionId: string; itemId: string } | null {
  const form = document.querySelector<HTMLFormElement>('[data-editor-form][data-collection-id][data-item-id]');
  if (!form?.dataset.collectionId || !form.dataset.itemId) return null;
  return { collectionId: form.dataset.collectionId, itemId: form.dataset.itemId };
}

let itemSaveTimer = 0;
function scheduleItemDraftSave(): void {
  const context = getItemContext();
  if (!context) return;
  window.clearTimeout(itemSaveTimer);
  setStatus('Saving draft', 'Autosaving this collection item.', true);
  itemSaveTimer = window.setTimeout(() => {
    void fetch('/api/items/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        siteId: 'joes-plumbing',
        collectionId: context.collectionId,
        itemId: context.itemId,
        values: serializeCollectionValues(),
        extraSections: serializeExtraSections(),
        updatedBy: 'owner',
      }),
    }).then((response) => {
      if (!response.ok) throw new Error('Unable to save draft item');
      setStatus('Draft saved', 'Collection item draft has been autosaved.', false);
    }).catch((error: unknown) => {
      setStatus('Save failed', error instanceof Error ? error.message : 'Unable to save draft item.', true);
    });
  }, 400);
}
```

Add `data-collection-id={activeCollection.id}` and `data-item-id={activeItem.id}` to the active item `<form>` in `src/pages/cms.astro`.

- [ ] **Step 3: Wire image field select/upload/remove**

Add delegated click handling:

```ts
function setImageFieldValue(fieldId: string, assetId: string | null): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-image-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  input.value = assetId ? JSON.stringify({ assetId, role: 'hero' }) : '';
  const preview = document.querySelector<HTMLElement>(`[data-image-preview="${CSS.escape(fieldId)}"]`);
  const asset = assetId ? mediaLibrary.get(assetId) : null;
  if (preview) {
    preview.innerHTML = '';
    if (asset) {
      const image = document.createElement('img');
      image.src = asset.variants.thumb.url;
      image.alt = asset.altText;
      image.width = asset.variants.thumb.width;
      image.height = asset.variants.thumb.height;
      preview.appendChild(image);
    } else {
      const empty = document.createElement('strong');
      empty.textContent = 'No image selected';
      preview.appendChild(empty);
    }
  }
  scheduleItemDraftSave();
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const applyButton = target?.closest<HTMLButtonElement>('[data-media-field-apply]');
  const removeButton = target?.closest<HTMLButtonElement>('[data-media-field-remove]');
  if (applyButton?.dataset.mediaFieldApply) {
    const fieldId = applyButton.dataset.mediaFieldApply;
    const select = document.querySelector<HTMLSelectElement>(`[data-media-select="${CSS.escape(fieldId)}"]`);
    setImageFieldValue(fieldId, select?.value || null);
  }
  if (removeButton?.dataset.mediaFieldRemove) {
    setImageFieldValue(removeButton.dataset.mediaFieldRemove, null);
  }
});
```

Add upload button handling:

```ts
document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-media-field-upload-button]');
  if (!button?.dataset.mediaFieldUploadButton) return;
  const fieldId = button.dataset.mediaFieldUploadButton;
  const input = document.querySelector<HTMLInputElement>(`[data-media-field-upload="${CSS.escape(fieldId)}"]`);
  const file = input?.files?.[0];
  if (!file) {
    setStatus('Choose an image', 'Select an image for this field first.', true);
    return;
  }
  void uploadMediaFile(file, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    .then((asset) => {
      setImageFieldValue(fieldId, asset.assetId);
      setStatus('Image selected', 'Uploaded image is saved in Media and selected for this field.', false);
    })
    .catch((error: unknown) => {
      setStatus('Upload failed', error instanceof Error ? error.message : 'Unable to upload image.', true);
    });
});
```

- [ ] **Step 4: Wire gallery add/upload/select/reorder/remove/hero**

Add helper functions:

```ts
function getGalleryValue(fieldId: string): { heroAssetId: string | null; assetIds: string[] } {
  const input = document.querySelector<HTMLInputElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`);
  if (!input?.value) return { heroAssetId: null, assetIds: [] };
  try {
    const parsed = JSON.parse(input.value) as { heroAssetId?: string | null; assetIds?: string[] };
    const assetIds = Array.isArray(parsed.assetIds) ? [...new Set(parsed.assetIds.filter(Boolean))] : [];
    return { heroAssetId: parsed.heroAssetId && assetIds.includes(parsed.heroAssetId) ? parsed.heroAssetId : assetIds[0] ?? null, assetIds };
  } catch {
    return { heroAssetId: null, assetIds: [] };
  }
}

function setGalleryValue(fieldId: string, value: { heroAssetId: string | null; assetIds: string[] }): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  input.value = JSON.stringify(value);
  const preview = document.querySelector<HTMLElement>(`[data-gallery-preview="${CSS.escape(fieldId)}"]`);
  if (preview) {
    preview.innerHTML = '';
    for (const assetId of value.assetIds) {
      const asset = mediaLibrary.get(assetId);
      if (!asset) continue;
      const card = document.createElement('article');
      card.className = `cms-gallery-item${assetId === value.heroAssetId ? ' is-hero' : ''}`;
      card.dataset.galleryAsset = assetId;
      const image = document.createElement('img');
      image.src = asset.variants.thumb.url;
      image.alt = asset.altText;
      image.width = asset.variants.thumb.width;
      image.height = asset.variants.thumb.height;
      const label = document.createElement('strong');
      label.textContent = asset.filename;
      card.appendChild(image);
      card.appendChild(label);
      preview.appendChild(card);
    }
  }
  scheduleItemDraftSave();
}
```

Add exact gallery button handling:

```ts
function getSelectedGalleryAssetId(fieldId: string): string {
  return document.querySelector<HTMLSelectElement>(`[data-gallery-select="${CSS.escape(fieldId)}"]`)?.value ?? '';
}

function addAssetToGallery(fieldId: string, assetId: string): void {
  const current = getGalleryValue(fieldId);
  if (!assetId || current.assetIds.includes(assetId)) return;
  const assetIds = [...current.assetIds, assetId];
  setGalleryValue(fieldId, {
    heroAssetId: current.heroAssetId ?? assetId,
    assetIds,
  });
}

function moveAssetInGallery(fieldId: string, assetId: string, direction: -1 | 1): void {
  const current = getGalleryValue(fieldId);
  const index = current.assetIds.indexOf(assetId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= current.assetIds.length) return;
  const assetIds = [...current.assetIds];
  const [asset] = assetIds.splice(index, 1);
  assetIds.splice(nextIndex, 0, asset);
  setGalleryValue(fieldId, {
    heroAssetId: current.heroAssetId,
    assetIds,
  });
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const addButton = target?.closest<HTMLButtonElement>('[data-gallery-add]');
  const uploadButton = target?.closest<HTMLButtonElement>('[data-gallery-upload-button]');
  const moveUpButton = target?.closest<HTMLButtonElement>('[data-gallery-move-up]');
  const moveDownButton = target?.closest<HTMLButtonElement>('[data-gallery-move-down]');
  const heroButton = target?.closest<HTMLButtonElement>('[data-gallery-set-hero]');
  const removeButton = target?.closest<HTMLButtonElement>('[data-gallery-remove]');

  if (addButton?.dataset.galleryAdd) {
    addAssetToGallery(addButton.dataset.galleryAdd, getSelectedGalleryAssetId(addButton.dataset.galleryAdd));
  }
  if (moveUpButton?.dataset.galleryMoveUp) {
    moveAssetInGallery(moveUpButton.dataset.galleryMoveUp, getSelectedGalleryAssetId(moveUpButton.dataset.galleryMoveUp), -1);
  }
  if (moveDownButton?.dataset.galleryMoveDown) {
    moveAssetInGallery(moveDownButton.dataset.galleryMoveDown, getSelectedGalleryAssetId(moveDownButton.dataset.galleryMoveDown), 1);
  }
  if (heroButton?.dataset.gallerySetHero) {
    const current = getGalleryValue(heroButton.dataset.gallerySetHero);
    const assetId = getSelectedGalleryAssetId(heroButton.dataset.gallerySetHero);
    if (current.assetIds.includes(assetId)) {
      setGalleryValue(heroButton.dataset.gallerySetHero, { ...current, heroAssetId: assetId });
    }
  }
  if (removeButton?.dataset.galleryRemove) {
    const current = getGalleryValue(removeButton.dataset.galleryRemove);
    const assetId = getSelectedGalleryAssetId(removeButton.dataset.galleryRemove);
    const assetIds = current.assetIds.filter((candidate) => candidate !== assetId);
    setGalleryValue(removeButton.dataset.galleryRemove, {
      heroAssetId: current.heroAssetId === assetId ? assetIds[0] ?? null : current.heroAssetId,
      assetIds,
    });
  }
  if (uploadButton?.dataset.galleryUploadButton) {
    const fieldId = uploadButton.dataset.galleryUploadButton;
    const input = document.querySelector<HTMLInputElement>(`[data-gallery-upload="${CSS.escape(fieldId)}"]`);
    const file = input?.files?.[0];
    if (!file) {
      setStatus('Choose an image', 'Select an image for this gallery first.', true);
      return;
    }
    void uploadMediaFile(file, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
      .then((asset) => {
        addAssetToGallery(fieldId, asset.assetId);
        setStatus('Gallery image added', 'Uploaded image is saved in Media and added to this gallery.', false);
      })
      .catch((error: unknown) => {
        setStatus('Upload failed', error instanceof Error ? error.message : 'Unable to upload image.', true);
      });
  }
});
```

- [ ] **Step 5: Wire rich-text image insertion**

Add:

```ts
document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-richtext-insert-image]');
  if (!button?.dataset.richtextInsertImage) return;
  const fieldId = button.dataset.richtextInsertImage;
  const select = document.querySelector<HTMLSelectElement>(`[data-richtext-media-select="${CSS.escape(fieldId)}"]`);
  const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[data-field="${CSS.escape(fieldId)}"]`);
  const assetId = select?.value;
  if (!assetId || !textarea) {
    setStatus('Choose an image', 'Select a media asset before inserting it into rich text.', true);
    return;
  }
  const asset = mediaLibrary.get(assetId);
  const marker = `[media:image assetId="${assetId}" caption="${asset?.caption ?? ''}"]`;
  const start = textarea.selectionStart ?? textarea.value.length;
  textarea.value = `${textarea.value.slice(0, start).trimEnd()}\\n\\n${marker}\\n\\n${textarea.value.slice(start).trimStart()}`.trim();
  scheduleItemDraftSave();
  setStatus('Image inserted', 'The rich text field now references a media library image.', true);
});
```

- [ ] **Step 6: Run tests, typecheck, and build**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit client behavior**

Run:

```bash
git add src/cms/client.ts src/pages/cms.astro
git commit -m "feat: edit media-connected collection fields"
```

## Task 7: Browser Verification and Final Push

**Files:**
- No planned source edits unless verification finds a bug.

- [ ] **Step 1: Start or verify local dev server**

Run:

```bash
curl -I --silent --max-time 5 'http://127.0.0.1:4322/cms?collection=blogPosts' | sed -n '1,5p'
```

Expected: `HTTP/1.1 200 OK`. If not running, start:

```bash
npm run dev -- --host 127.0.0.1 --port 4322
```

- [ ] **Step 2: Browser verify blog hero image field**

Open:

```text
http://127.0.0.1:4322/cms?collection=blogPosts&item=shutOffWater
```

Expected:

- `Hero Image` renders as a preview card.
- `Choose from media`, `Upload image`, and `Remove` controls are visible.
- The preview alt text comes from the media asset.

- [ ] **Step 3: Browser verify service gallery**

Open:

```text
http://127.0.0.1:4322/cms?collection=services&item=emergency
```

Expected:

- `Image Gallery` renders thumbnail cards.
- A hero badge appears on the selected hero image.
- Adding from media updates the hidden gallery value and save status.
- Reorder and remove controls do not throw console errors.

- [ ] **Step 4: Browser verify rich text image insertion**

Open:

```text
http://127.0.0.1:4322/cms?collection=blogPosts&item=shutOffWater
```

Select a media asset in the `Body` toolbar and click `Insert image`.

Expected:

- The body textarea includes `[media:image assetId="joes-plumbing-van"]` or the uploaded asset ID chosen during the browser test.
- The save status changes to draft saved after autosave.
- Reloading the same URL keeps the marker in the textarea.

- [ ] **Step 5: Check console errors**

Use the browser console tool or Playwright CLI:

```bash
PWCLI=/Users/ajnalder/.codex/skills/playwright/scripts/playwright_cli.sh
"$PWCLI" console error
```

Expected: zero errors.

- [ ] **Step 6: Final verification commands**

Run:

```bash
npm test
npx tsc --noEmit
npm run build
git status --short --branch
```

Expected:

- tests pass
- typecheck passes
- build passes
- git status shows the feature branch with no uncommitted changes after the final commit

- [ ] **Step 7: Push branch**

Run:

```bash
git push
```

Expected: branch `feat/cms-structured-editor` pushes to `origin`.
