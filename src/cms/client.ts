import { createRichTextImageMarker, insertRichTextImageMarker } from './media-field-values';
import { optimizeImageFile } from '../media/browser-optimizer';
import type { MediaAsset } from '../media/types';

const root = document.querySelector<HTMLElement>('[data-cms-root]');
const statusText = document.querySelector<HTMLElement>('[data-status-text]');
const statusPill = document.querySelector<HTMLElement>('[data-status-pill]');
const statusHelper = document.querySelector<HTMLElement>('[data-status-helper]');
const publishButton = document.querySelector<HTMLButtonElement>('[data-publish-button]');
const editorForm = document.querySelector<HTMLFormElement>('[data-editor-form]');
const mediaUploadInput = document.querySelector<HTMLInputElement>('[data-media-upload]');
const mediaUploadButton = document.querySelector<HTMLButtonElement>('[data-media-upload-button]');
const mediaAltInput = document.querySelector<HTMLInputElement>('[data-media-alt]');
const mediaCaptionInput = document.querySelector<HTMLInputElement>('[data-media-caption]');
const mediaMetadataTimers = new Map<string, number>();
const mediaLibrary = new Map<string, MediaAsset>();
const mediaLibraryJson = root?.dataset.mediaLibrary ?? '[]';

for (const asset of JSON.parse(mediaLibraryJson) as MediaAsset[]) {
  mediaLibrary.set(asset.assetId, asset);
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1000 * 1000) {
    return `${Math.round(bytes / 1000)} KB`;
  }
  return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
}

function setStatus(label: string, helper: string, dirty: boolean): void {
  if (statusText) {
    statusText.textContent = label;
  }
  if (statusPill) {
    statusPill.textContent = label;
  }
  if (statusHelper) {
    statusHelper.textContent = helper;
  }
  if (publishButton) {
    publishButton.disabled = !dirty;
  }
  root?.setAttribute('data-editor-dirty', String(dirty));
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
  const asset = (await response.json()) as MediaAsset;
  mediaLibrary.set(asset.assetId, asset);
  return asset;
}

function createMediaField(labelText: string, value: string, dataAttribute: string, assetId: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'cms-field';

  const text = document.createElement('span');
  text.textContent = labelText;

  const input = document.createElement('input');
  input.className = 'cms-input';
  input.value = value;
  input.setAttribute(dataAttribute, assetId);

  label.appendChild(text);
  label.appendChild(input);
  return label;
}

function createMediaMetaTerm(labelText: string, value: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  term.textContent = labelText;
  description.textContent = value;
  wrapper.appendChild(term);
  wrapper.appendChild(description);

  return wrapper;
}

function updateMediaCounts(): void {
  const count = document.querySelectorAll('[data-media-asset]').length;
  document.querySelectorAll<HTMLElement>('[data-media-count]').forEach((counter) => {
    counter.textContent = String(count);
  });
}

function appendMediaAssetRow(asset: MediaAsset): void {
  const list = document.querySelector<HTMLElement>('[data-media-asset-list]');
  if (!list) {
    return;
  }

  document.querySelector<HTMLElement>(`[data-media-asset-row="${CSS.escape(asset.assetId)}"]`)?.remove();

  const row = document.createElement('a');
  row.className = 'cms-item-row';
  row.href = `#media-${asset.assetId}`;
  row.dataset.mediaAssetRow = asset.assetId;

  const text = document.createElement('span');
  const filename = document.createElement('strong');
  const dimensions = document.createElement('small');
  const bytes = document.createElement('em');

  filename.textContent = asset.filename;
  dimensions.textContent = `${asset.width} x ${asset.height}`;
  bytes.textContent = formatBytes(asset.variants.large.bytes);

  text.appendChild(filename);
  text.appendChild(dimensions);
  row.appendChild(text);
  row.appendChild(bytes);
  list.insertBefore(row, list.firstChild);
}

function appendMediaAsset(asset: MediaAsset): void {
  const grid = document.querySelector<HTMLElement>('.cms-media-grid');
  if (!grid) {
    return;
  }

  document.querySelector<HTMLElement>(`[data-media-asset="${CSS.escape(asset.assetId)}"]`)?.remove();

  const card = document.createElement('article');
  card.className = 'cms-media-card';
  card.id = `media-${asset.assetId}`;
  card.dataset.mediaAsset = asset.assetId;

  const preview = document.createElement('img');
  preview.className = 'cms-media-preview';
  preview.src = asset.variants.thumb.url;
  preview.alt = asset.altText;
  preview.width = asset.variants.thumb.width;
  preview.height = asset.variants.thumb.height;

  const meta = document.createElement('dl');
  meta.className = 'cms-media-meta';
  meta.appendChild(createMediaMetaTerm('Size', `${asset.width} x ${asset.height}`));
  meta.appendChild(createMediaMetaTerm('Large', formatBytes(asset.variants.large.bytes)));

  card.appendChild(preview);
  card.appendChild(createMediaField('Alt text', asset.altText, 'data-media-asset-alt', asset.assetId));
  card.appendChild(createMediaField('Caption', asset.caption, 'data-media-asset-caption', asset.assetId));
  card.appendChild(meta);
  grid.insertBefore(card, grid.firstChild);
  appendMediaAssetRow(asset);
  updateMediaCounts();
}

editorForm?.addEventListener('input', () => {
  setStatus('Draft changes', 'Autosaved locally. Publish when this content should go live.', true);
  scheduleItemDraftSave();
});

publishButton?.addEventListener('click', () => {
  setStatus('Published', 'Published in this editor session. A production publish will trigger an Astro rebuild.', false);
});

function parseFieldValue(field: HTMLInputElement | HTMLTextAreaElement): unknown {
  if (field instanceof HTMLInputElement && field.type === 'hidden') {
    if (!field.value) {
      return null;
    }
    try {
      return JSON.parse(field.value);
    } catch {
      return field.value;
    }
  }
  return field.value;
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

function updateImageFieldPreview(fieldId: string, assetId: string | null): void {
  const preview = document.querySelector<HTMLElement>(`[data-image-preview="${CSS.escape(fieldId)}"]`);
  if (!preview) return;

  preview.innerHTML = '';
  const asset = assetId ? mediaLibrary.get(assetId) : null;
  if (!asset) {
    const empty = document.createElement('strong');
    empty.textContent = 'No image selected';
    preview.appendChild(empty);
    return;
  }

  const image = document.createElement('img');
  image.src = asset.variants.thumb.url;
  image.alt = asset.altText;
  image.width = asset.variants.thumb.width;
  image.height = asset.variants.thumb.height;

  const caption = document.createElement('div');
  caption.className = 'cms-media-field-caption';
  const filename = document.createElement('strong');
  const altText = document.createElement('small');
  filename.textContent = asset.filename;
  altText.textContent = asset.altText;
  caption.appendChild(filename);
  caption.appendChild(altText);

  preview.appendChild(image);
  preview.appendChild(caption);
}

function setImageFieldValue(fieldId: string, assetId: string | null): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-image-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  input.value = assetId ? JSON.stringify({ assetId, role: 'hero' }) : '';
  updateImageFieldPreview(fieldId, assetId);
  scheduleItemDraftSave();
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const applyButton = target?.closest<HTMLButtonElement>('[data-media-field-apply]');
  const removeButton = target?.closest<HTMLButtonElement>('[data-media-field-remove]');
  if (applyButton?.dataset.mediaFieldApply) {
    const fieldId = applyButton.dataset.mediaFieldApply;
    const select = document.querySelector(`[data-media-select="${CSS.escape(fieldId)}"]`) as HTMLSelectElement | null;
    setImageFieldValue(fieldId, select?.value || null);
  }
  if (removeButton?.dataset.mediaFieldRemove) {
    setImageFieldValue(removeButton.dataset.mediaFieldRemove, null);
  }
});

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

function getGalleryValue(fieldId: string): { heroAssetId: string | null; assetIds: string[] } {
  const input = document.querySelector<HTMLInputElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`);
  if (!input?.value) return { heroAssetId: null, assetIds: [] };
  try {
    const parsed = JSON.parse(input.value) as { heroAssetId?: string | null; assetIds?: string[] };
    const assetIds = Array.isArray(parsed.assetIds) ? [...new Set(parsed.assetIds.filter(Boolean))] : [];
    return {
      heroAssetId: parsed.heroAssetId && assetIds.includes(parsed.heroAssetId) ? parsed.heroAssetId : assetIds[0] ?? null,
      assetIds,
    };
  } catch {
    return { heroAssetId: null, assetIds: [] };
  }
}

function renderGalleryPreview(fieldId: string, value: { heroAssetId: string | null; assetIds: string[] }): void {
  const preview = document.querySelector<HTMLElement>(`[data-gallery-preview="${CSS.escape(fieldId)}"]`);
  if (!preview) return;

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

function setGalleryValue(fieldId: string, value: { heroAssetId: string | null; assetIds: string[] }): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  const assetIds = [...new Set(value.assetIds.filter(Boolean))];
  const heroAssetId = value.heroAssetId && assetIds.includes(value.heroAssetId) ? value.heroAssetId : assetIds[0] ?? null;
  const nextValue = { heroAssetId, assetIds };
  input.value = JSON.stringify(nextValue);
  renderGalleryPreview(fieldId, nextValue);
  scheduleItemDraftSave();
}

function getSelectedGalleryAssetId(fieldId: string): string {
  const select = document.querySelector(`[data-gallery-select="${CSS.escape(fieldId)}"]`) as HTMLSelectElement | null;
  return select?.value ?? '';
}

function addAssetToGallery(fieldId: string, assetId: string): void {
  const current = getGalleryValue(fieldId);
  if (!assetId) {
    setStatus('Choose an image', 'Select a media asset before adding it to this gallery.', true);
    return;
  }
  if (current.assetIds.includes(assetId)) {
    setStatus('Already in gallery', 'That image is already in this gallery.', false);
    return;
  }
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

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-richtext-insert-image]');
  if (!button?.dataset.richtextInsertImage) return;
  const fieldId = button.dataset.richtextInsertImage;
  const select = document.querySelector(`[data-richtext-media-select="${CSS.escape(fieldId)}"]`) as HTMLSelectElement | null;
  const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[data-field="${CSS.escape(fieldId)}"]`);
  const assetId = select?.value;
  if (!assetId || !textarea) {
    setStatus('Choose an image', 'Select a media asset before inserting it into rich text.', true);
    return;
  }
  const asset = mediaLibrary.get(assetId);
  const marker = createRichTextImageMarker(assetId, asset?.caption ?? '');
  textarea.value = insertRichTextImageMarker(textarea.value, marker, textarea.selectionStart ?? textarea.value.length);
  scheduleItemDraftSave();
  setStatus('Image inserted', 'The rich text field now references a media library image.', true);
});

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
  const asset = await uploadMediaFile(file, mediaAltInput.value.trim(), mediaCaptionInput?.value.trim() ?? '');
  appendMediaAsset(asset);
  if (mediaUploadInput) {
    mediaUploadInput.value = '';
  }
  if (mediaAltInput) {
    mediaAltInput.value = '';
  }
  if (mediaCaptionInput) {
    mediaCaptionInput.value = '';
  }
  setStatus('Media saved', 'The optimized image is now in the media library.', false);
}

function getMediaAssetInputs(assetId: string): { altInput: HTMLInputElement | null; captionInput: HTMLInputElement | null } {
  return {
    altInput: document.querySelector<HTMLInputElement>(`[data-media-asset-alt="${CSS.escape(assetId)}"]`),
    captionInput: document.querySelector<HTMLInputElement>(`[data-media-asset-caption="${CSS.escape(assetId)}"]`),
  };
}

function scheduleMediaMetadataSave(assetId: string): void {
  window.clearTimeout(mediaMetadataTimers.get(assetId));
  setStatus('Saving media', 'Autosaving image alt text and caption.', true);
  mediaMetadataTimers.set(
    assetId,
    window.setTimeout(() => {
      const { altInput, captionInput } = getMediaAssetInputs(assetId);
      void fetch(`/api/media/${encodeURIComponent(assetId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          siteId: 'joes-plumbing',
          altText: altInput?.value ?? '',
          caption: captionInput?.value ?? '',
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Unable to save media metadata');
          }
          setStatus('Media saved', 'Image metadata has been autosaved.', false);
        })
        .catch((error: unknown) => {
          setStatus('Save failed', error instanceof Error ? error.message : 'Unable to save media metadata.', true);
        });
    }, 300),
  );
}

mediaUploadButton?.addEventListener('click', () => {
  void uploadSelectedMedia().catch((error: unknown) => {
    setStatus('Upload failed', error instanceof Error ? error.message : 'Unable to upload media.', true);
  });
});

document.addEventListener('input', (event) => {
  const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>(
    '[data-media-asset-alt], [data-media-asset-caption]',
  );
  const assetId = input?.dataset.mediaAssetAlt ?? input?.dataset.mediaAssetCaption;
  if (assetId) {
    scheduleMediaMetadataSave(assetId);
  }
});

export {};
