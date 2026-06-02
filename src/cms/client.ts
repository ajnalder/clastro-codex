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
});

publishButton?.addEventListener('click', () => {
  setStatus('Published', 'Published in this editor session. A production publish will trigger an Astro rebuild.', false);
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
    const error = await response.text();
    setStatus('Upload failed', error, true);
    return;
  }
  const asset = (await response.json()) as MediaAsset;
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
