import { optimizeImageFile } from '../media/browser-optimizer';

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
  setStatus('Media saved', 'The optimized image is now in the media library.', false);
  window.location.href = '/cms?view=media';
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

document.querySelectorAll<HTMLInputElement>('[data-media-asset-alt], [data-media-asset-caption]').forEach((input) => {
  input.addEventListener('input', () => {
    const assetId = input.dataset.mediaAssetAlt ?? input.dataset.mediaAssetCaption;
    if (assetId) {
      scheduleMediaMetadataSave(assetId);
    }
  });
});

export {};
