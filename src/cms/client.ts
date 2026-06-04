import {
  Bold,
  createIcons,
  GripVertical,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide';
import {
  addGalleryAsset,
  createImageValueFromGalleryHero,
  createRichTextImageMarker,
  insertRichTextImageMarker,
  removeGalleryAsset,
  reorderGalleryAsset,
  setGalleryHero,
} from './media-field-values';
import { optimizeImageFile } from '../media/browser-optimizer';
import type { MediaAsset } from '../media/types';

interface CmsClientMediaAssetView {
  assetId: string;
  filename: string;
  altText: string;
  caption: string;
  width: number;
  height: number;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  largeBytesLabel: string;
}

type CmsClientMediaAsset = MediaAsset | CmsClientMediaAssetView;

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
const mediaLibrary = new Map<string, CmsClientMediaAsset>();
const mediaLibraryJson = root?.dataset.mediaLibrary ?? '[]';
const galleryIcons = {
  Bold,
  GripVertical,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Plus,
  Star,
  Trash2,
  Upload,
};

for (const asset of JSON.parse(mediaLibraryJson) as CmsClientMediaAsset[]) {
  mediaLibrary.set(asset.assetId, asset);
}

function renderIcons(container: Document | HTMLElement = document): void {
  createIcons({
    icons: galleryIcons,
    attrs: {
      'stroke-width': '2',
      'aria-hidden': 'true',
    },
    root: container,
  });
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

function getAssetPreview(asset: CmsClientMediaAsset): { url: string; width: number; height: number } {
  if ('variants' in asset) {
    return {
      url: asset.variants.thumb.url,
      width: asset.variants.thumb.width,
      height: asset.variants.thumb.height,
    };
  }
  return {
    url: asset.previewUrl,
    width: asset.previewWidth,
    height: asset.previewHeight,
  };
}

function getAssetLargeBytesLabel(asset: CmsClientMediaAsset): string {
  if ('variants' in asset) {
    return formatBytes(asset.variants.large.bytes);
  }
  return asset.largeBytesLabel;
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
  appendMediaOptions(asset);
  return asset;
}

function appendPickerOption(list: HTMLElement, asset: CmsClientMediaAsset, kind: 'media' | 'gallery' | 'richtext'): void {
  const assetAttribute =
    kind === 'media'
      ? 'data-media-picker-asset'
      : kind === 'gallery'
        ? 'data-gallery-picker-asset'
        : 'data-richtext-image-asset';
  if (list.querySelector(`[${assetAttribute}="${CSS.escape(asset.assetId)}"]`)) {
    return;
  }

  const button = document.createElement('button');
  button.className = 'cms-picker-option';
  button.type = 'button';
  if (kind === 'media') {
    button.dataset.mediaPickerSelect = list.dataset.mediaPickerList ?? '';
    button.dataset.mediaPickerAsset = asset.assetId;
  } else if (kind === 'gallery') {
    button.dataset.galleryPickerSelect = list.dataset.galleryPickerList ?? '';
    button.dataset.galleryPickerAsset = asset.assetId;
  } else {
    button.dataset.richtextImageSelect = list.dataset.richtextPickerList ?? '';
    button.dataset.richtextImageAsset = asset.assetId;
  }

  const image = document.createElement('img');
  const preview = getAssetPreview(asset);
  image.src = preview.url;
  image.alt = asset.altText;
  image.width = preview.width;
  image.height = preview.height;

  const text = document.createElement('span');
  const filename = document.createElement('strong');
  const altText = document.createElement('small');
  filename.textContent = asset.filename;
  altText.textContent = asset.altText;
  text.appendChild(filename);
  text.appendChild(altText);

  button.appendChild(image);
  button.appendChild(text);
  list.insertBefore(button, list.firstChild);
}

function appendMediaOptions(asset: MediaAsset): void {
  document.querySelectorAll('[data-richtext-media-select]').forEach((element) => {
    const select = element as unknown as HTMLSelectElement;
    if ([...select.options].some((option) => option.value === asset.assetId)) {
      return;
    }
    const option = document.createElement('option');
    option.value = asset.assetId;
    option.textContent = asset.filename;
    select.appendChild(option);
  });
  document.querySelectorAll<HTMLElement>('[data-media-picker-list]').forEach((list) => {
    appendPickerOption(list, asset, 'media');
  });
  document.querySelectorAll<HTMLElement>('[data-gallery-picker-list]').forEach((list) => {
    appendPickerOption(list, asset, 'gallery');
  });
  document.querySelectorAll<HTMLElement>('[data-richtext-picker-list]').forEach((list) => {
    appendPickerOption(list, asset, 'richtext');
  });
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
  bytes.textContent = getAssetLargeBytesLabel(asset);

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
  const previewAsset = getAssetPreview(asset);
  preview.className = 'cms-media-preview';
  preview.src = previewAsset.url;
  preview.alt = asset.altText;
  preview.width = previewAsset.width;
  preview.height = previewAsset.height;

  const meta = document.createElement('dl');
  meta.className = 'cms-media-meta';
  meta.appendChild(createMediaMetaTerm('Size', `${asset.width} x ${asset.height}`));
  meta.appendChild(createMediaMetaTerm('Large', getAssetLargeBytesLabel(asset)));

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
  const previewAsset = getAssetPreview(asset);
  image.src = previewAsset.url;
  image.alt = asset.altText;
  image.width = previewAsset.width;
  image.height = previewAsset.height;

  const removeButton = document.createElement('button');
  removeButton.className = 'cms-icon-button cms-media-field-action';
  removeButton.type = 'button';
  removeButton.title = 'Remove image';
  removeButton.setAttribute('aria-label', `Remove ${asset.filename}`);
  removeButton.dataset.mediaFieldRemove = fieldId;
  const removeIcon = document.createElement('i');
  removeIcon.dataset.lucide = 'trash-2';
  removeButton.appendChild(removeIcon);

  const caption = document.createElement('div');
  caption.className = 'cms-media-field-caption';
  const filename = document.createElement('strong');
  const altText = document.createElement('small');
  filename.textContent = asset.filename;
  altText.textContent = asset.altText;
  caption.appendChild(filename);
  caption.appendChild(altText);

  preview.appendChild(image);
  preview.appendChild(removeButton);
  preview.appendChild(caption);
  renderIcons(preview);
}

function setImageFieldValue(fieldId: string, assetId: string | null, options: { autosave?: boolean } = {}): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-image-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  input.value = assetId ? JSON.stringify({ assetId, role: 'hero' }) : '';
  updateImageFieldPreview(fieldId, assetId);
  if (options.autosave !== false) {
    scheduleItemDraftSave();
  }
}

function closeMediaPickers(except?: HTMLElement): void {
  document.querySelectorAll<HTMLElement>('[data-media-picker], [data-gallery-picker], [data-richtext-picker]').forEach((picker) => {
    if (picker === except) {
      return;
    }
    picker.hidden = true;
  });
}

function togglePicker(picker: HTMLElement | null): void {
  if (!picker) return;
  const shouldOpen = picker.hidden;
  closeMediaPickers(picker);
  picker.hidden = !shouldOpen;
  if (shouldOpen) {
    picker.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }
}

function filterPickerOptions(input: HTMLInputElement): void {
  const picker = input.closest<HTMLElement>('[data-media-picker], [data-gallery-picker], [data-richtext-picker]');
  const query = input.value.trim().toLowerCase();
  picker?.querySelectorAll<HTMLElement>('.cms-picker-option').forEach((option) => {
    option.hidden = Boolean(query) && !option.textContent?.toLowerCase().includes(query);
  });
}

function getRichTextTextarea(fieldId: string): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>(`textarea[data-field="${CSS.escape(fieldId)}"]`);
}

function replaceTextareaSelection(textarea: HTMLTextAreaElement, replacement: string): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  textarea.value = `${textarea.value.slice(0, start)}${replacement}${textarea.value.slice(end)}`;
  const cursorPosition = start + replacement.length;
  textarea.focus();
  textarea.setSelectionRange(cursorPosition, cursorPosition);
}

function wrapTextareaSelection(textarea: HTMLTextAreaElement, prefix: string, suffix: string, fallback: string): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const selectedText = textarea.value.slice(start, end) || fallback;
  textarea.value = `${textarea.value.slice(0, start)}${prefix}${selectedText}${suffix}${textarea.value.slice(end)}`;
  textarea.focus();
  textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
}

function formatSelectedLines(textarea: HTMLTextAreaElement, formatter: (line: string, index: number) => string, fallback: string): void {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const selectedText = textarea.value.slice(start, end) || fallback;
  const formatted = selectedText
    .split('\n')
    .map((line, index) => formatter(line.replace(/^(#{2,3}|[-*]|\d+\.)\s+/, ''), index))
    .join('\n');
  textarea.value = `${textarea.value.slice(0, start)}${formatted}${textarea.value.slice(end)}`;
  textarea.focus();
  textarea.setSelectionRange(start, start + formatted.length);
}

function insertRichTextImage(fieldId: string, assetId: string | null | undefined): void {
  const textarea = getRichTextTextarea(fieldId);
  if (!assetId || !textarea) {
    setStatus('Choose an image', 'Select a media asset before inserting it into rich text.', true);
    return;
  }
  const asset = mediaLibrary.get(assetId);
  const marker = createRichTextImageMarker(assetId, asset?.caption ?? '');
  textarea.value = insertRichTextImageMarker(textarea.value, marker, textarea.selectionStart ?? textarea.value.length);
  textarea.focus();
  scheduleItemDraftSave();
  setStatus('Image inserted', 'The article body now references a media library image.', true);
}

function applyRichTextFormat(fieldId: string, action: string): void {
  const textarea = getRichTextTextarea(fieldId);
  if (!textarea) return;

  if (action === 'h2') {
    formatSelectedLines(textarea, (line) => `## ${line || 'Section heading'}`, 'Section heading');
  } else if (action === 'h3') {
    formatSelectedLines(textarea, (line) => `### ${line || 'Subheading'}`, 'Subheading');
  } else if (action === 'bold') {
    wrapTextareaSelection(textarea, '**', '**', 'bold text');
  } else if (action === 'italic') {
    wrapTextareaSelection(textarea, '*', '*', 'italic text');
  } else if (action === 'bullet') {
    formatSelectedLines(textarea, (line) => `- ${line || 'List item'}`, 'List item');
  } else if (action === 'numbered') {
    formatSelectedLines(textarea, (line, index) => `${index + 1}. ${line || 'List item'}`, 'List item');
  } else if (action === 'link') {
    const selectedText = textarea.value.slice(textarea.selectionStart ?? 0, textarea.selectionEnd ?? 0) || 'link text';
    const href = window.prompt('Paste the link URL');
    if (!href) return;
    replaceTextareaSelection(textarea, `[${selectedText}](${href})`);
  }

  scheduleItemDraftSave();
  setStatus('Article updated', 'Formatting has been added to the blog body.', true);
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const openMediaPickerButton = target?.closest<HTMLButtonElement>('[data-media-picker-open]');
  const chooseMediaButton = target?.closest<HTMLButtonElement>('[data-media-picker-select]');
  const removeButton = target?.closest<HTMLButtonElement>('[data-media-field-remove]');
  const openRichTextPickerButton = target?.closest<HTMLButtonElement>('[data-richtext-image-picker-open]');
  const chooseRichTextImageButton = target?.closest<HTMLButtonElement>('[data-richtext-image-select]');

  if (openMediaPickerButton?.dataset.mediaPickerOpen) {
    togglePicker(document.querySelector<HTMLElement>(`[data-media-picker="${CSS.escape(openMediaPickerButton.dataset.mediaPickerOpen)}"]`));
    return;
  }
  if (chooseMediaButton?.dataset.mediaPickerSelect) {
    setImageFieldValue(chooseMediaButton.dataset.mediaPickerSelect, chooseMediaButton.dataset.mediaPickerAsset ?? null);
    closeMediaPickers();
    return;
  }
  if (removeButton?.dataset.mediaFieldRemove) {
    setImageFieldValue(removeButton.dataset.mediaFieldRemove, null);
    return;
  }
  if (openRichTextPickerButton?.dataset.richtextImagePickerOpen) {
    togglePicker(document.querySelector<HTMLElement>(`[data-richtext-picker="${CSS.escape(openRichTextPickerButton.dataset.richtextImagePickerOpen)}"]`));
    return;
  }
  if (chooseRichTextImageButton?.dataset.richtextImageSelect) {
    insertRichTextImage(chooseRichTextImageButton.dataset.richtextImageSelect, chooseRichTextImageButton.dataset.richtextImageAsset);
    closeMediaPickers();
    return;
  }
  if (!target?.closest('[data-media-picker], [data-gallery-picker], [data-richtext-picker], [data-media-picker-open], [data-gallery-picker-open], [data-richtext-image-picker-open]')) {
    closeMediaPickers();
  }
});

document.addEventListener('input', (event) => {
  const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-media-picker-search], [data-gallery-picker-search], [data-richtext-picker-search]');
  if (input) {
    filterPickerOptions(input);
  }
});

function updateImageUploadHelper(fieldId: string, text: string): void {
  const helper = document.querySelector<HTMLElement>(`[data-media-file-name="${CSS.escape(fieldId)}"]`);
  if (helper) {
    helper.textContent = text;
  }
}

document.addEventListener('change', (event) => {
  const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-media-field-upload]');
  if (!input?.dataset.mediaFieldUpload) return;
  const fieldId = input.dataset.mediaFieldUpload;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  updateImageUploadHelper(fieldId, file.name);
  setStatus('Optimizing image', 'Creating WebP website variants before selecting this image.', true);
  void uploadMediaFile(file, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    .then((asset) => {
      setImageFieldValue(fieldId, asset.assetId);
      input.value = '';
      updateImageUploadHelper(fieldId, 'Uploaded images are optimized and selected immediately.');
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
    const card = document.createElement('article');
    card.className = `cms-gallery-item${assetId === value.heroAssetId ? ' is-hero' : ''}`;
    card.dataset.galleryAsset = assetId;
    card.draggable = true;
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Gallery image: ${asset?.filename ?? assetId}`);

    const dragHandle = document.createElement('span');
    dragHandle.className = 'cms-gallery-drag';
    dragHandle.setAttribute('aria-hidden', 'true');
    const dragIcon = document.createElement('i');
    dragIcon.dataset.lucide = 'grip-vertical';
    dragHandle.appendChild(dragIcon);
    card.appendChild(dragHandle);

    if (asset) {
      const image = document.createElement('img');
      const previewAsset = getAssetPreview(asset);
      image.src = previewAsset.url;
      image.alt = asset.altText;
      image.width = previewAsset.width;
      image.height = previewAsset.height;
      card.appendChild(image);
    }

    const footer = document.createElement('div');
    footer.className = 'cms-gallery-item-footer';
    const label = document.createElement('strong');
    label.textContent = asset?.filename ?? assetId;
    footer.appendChild(label);

    if (assetId === value.heroAssetId) {
      const heroLabel = document.createElement('span');
      heroLabel.textContent = 'Hero';
      footer.appendChild(heroLabel);
    }

    const actions = document.createElement('div');
    actions.className = 'cms-gallery-actions';
    actions.setAttribute('aria-label', `${asset?.filename ?? assetId} actions`);

    const heroButton = document.createElement('button');
    heroButton.className = `cms-icon-button cms-gallery-action${assetId === value.heroAssetId ? ' is-active' : ''}`;
    heroButton.type = 'button';
    heroButton.title = 'Make hero image';
    heroButton.setAttribute('aria-label', `Make ${asset?.filename ?? assetId} the hero image`);
    heroButton.dataset.gallerySetHero = fieldId;
    heroButton.dataset.galleryAssetId = assetId;
    const heroIcon = document.createElement('i');
    heroIcon.dataset.lucide = 'star';
    heroButton.appendChild(heroIcon);

    const removeButton = document.createElement('button');
    removeButton.className = 'cms-icon-button cms-gallery-action';
    removeButton.type = 'button';
    removeButton.title = 'Remove image';
    removeButton.setAttribute('aria-label', `Remove ${asset?.filename ?? assetId} from gallery`);
    removeButton.dataset.galleryRemove = fieldId;
    removeButton.dataset.galleryAssetId = assetId;
    const removeIcon = document.createElement('i');
    removeIcon.dataset.lucide = 'trash-2';
    removeButton.appendChild(removeIcon);

    actions.appendChild(heroButton);
    actions.appendChild(removeButton);
    card.appendChild(footer);
    card.appendChild(actions);
    preview.appendChild(card);
  }
  renderIcons(preview);
}

function setGalleryValue(fieldId: string, value: { heroAssetId: string | null; assetIds: string[] }): void {
  const input = document.querySelector<HTMLInputElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`);
  if (!input) return;
  const assetIds = [...new Set(value.assetIds.filter(Boolean))];
  const heroAssetId = value.heroAssetId && assetIds.includes(value.heroAssetId) ? value.heroAssetId : assetIds[0] ?? null;
  const nextValue = { heroAssetId, assetIds };
  input.value = JSON.stringify(nextValue);
  renderGalleryPreview(fieldId, nextValue);
  syncImageFieldFromGallery(fieldId, nextValue);
  scheduleItemDraftSave();
}

function getGallerySyncedImageFieldId(fieldId: string): string | null {
  const shell = document.querySelector<HTMLElement>(`[data-media-gallery-field="${CSS.escape(fieldId)}"]`)?.closest<HTMLElement>('[data-cms-field-shell]');
  const value = shell?.dataset.gallerySyncImageField;
  return value && value !== 'undefined' ? value : null;
}

function syncImageFieldFromGallery(fieldId: string, value: { heroAssetId: string | null; assetIds: string[] }): void {
  const imageFieldId = getGallerySyncedImageFieldId(fieldId);
  if (!imageFieldId) return;
  const imageValue = createImageValueFromGalleryHero(value);
  setImageFieldValue(imageFieldId, imageValue?.assetId ?? null, { autosave: false });
}

function getImageFieldAssetId(fieldId: string): string | null {
  const input = document.querySelector<HTMLInputElement>(`[data-media-image-field="${CSS.escape(fieldId)}"]`);
  if (!input?.value) return null;
  try {
    const parsed = JSON.parse(input.value) as { assetId?: unknown };
    return typeof parsed.assetId === 'string' ? parsed.assetId : null;
  } catch {
    return null;
  }
}

function initializeSyncedGalleryImages(): void {
  let didSync = false;
  document.querySelectorAll<HTMLInputElement>('[data-media-gallery-field]').forEach((input) => {
    const fieldId = input.dataset.mediaGalleryField;
    if (!fieldId) return;
    const imageFieldId = getGallerySyncedImageFieldId(fieldId);
    if (!imageFieldId) return;
    const galleryValue = getGalleryValue(fieldId);
    const imageValue = createImageValueFromGalleryHero(galleryValue);
    if (getImageFieldAssetId(imageFieldId) !== (imageValue?.assetId ?? null)) {
      syncImageFieldFromGallery(fieldId, galleryValue);
      didSync = true;
    }
  });
  if (didSync) {
    scheduleItemDraftSave();
  }
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
  setGalleryValue(fieldId, addGalleryAsset(current, assetId));
}

function updateGalleryUploadHelper(fieldId: string, text: string): void {
  const helper = document.querySelector<HTMLElement>(`[data-gallery-file-name="${CSS.escape(fieldId)}"]`);
  if (helper) {
    helper.textContent = text;
  }
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const openGalleryPickerButton = target?.closest<HTMLButtonElement>('[data-gallery-picker-open]');
  const chooseGalleryButton = target?.closest<HTMLButtonElement>('[data-gallery-picker-select]');
  const heroButton = target?.closest<HTMLButtonElement>('[data-gallery-set-hero]');
  const removeButton = target?.closest<HTMLButtonElement>('[data-gallery-remove]');

  if (openGalleryPickerButton?.dataset.galleryPickerOpen) {
    togglePicker(document.querySelector<HTMLElement>(`[data-gallery-picker="${CSS.escape(openGalleryPickerButton.dataset.galleryPickerOpen)}"]`));
    return;
  }
  if (chooseGalleryButton?.dataset.galleryPickerSelect) {
    addAssetToGallery(chooseGalleryButton.dataset.galleryPickerSelect, chooseGalleryButton.dataset.galleryPickerAsset ?? '');
    closeMediaPickers();
    return;
  }
  if (heroButton?.dataset.gallerySetHero) {
    const current = getGalleryValue(heroButton.dataset.gallerySetHero);
    const assetId = heroButton.dataset.galleryAssetId ?? '';
    if (current.assetIds.includes(assetId)) {
      setGalleryValue(heroButton.dataset.gallerySetHero, setGalleryHero(current, assetId));
    }
    return;
  }
  if (removeButton?.dataset.galleryRemove) {
    const current = getGalleryValue(removeButton.dataset.galleryRemove);
    const assetId = removeButton.dataset.galleryAssetId ?? '';
    if (assetId) {
      setGalleryValue(removeButton.dataset.galleryRemove, removeGalleryAsset(current, assetId));
    }
    return;
  }
});

document.addEventListener('change', (event) => {
  const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('[data-gallery-upload]');
  if (!input?.dataset.galleryUpload) return;
  const fieldId = input.dataset.galleryUpload;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  updateGalleryUploadHelper(fieldId, file.name);
  setStatus('Optimizing image', 'Creating WebP website variants before adding this image.', true);
  void uploadMediaFile(file, file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    .then((asset) => {
      addAssetToGallery(fieldId, asset.assetId);
      input.value = '';
      updateGalleryUploadHelper(fieldId, 'Drag images to reorder. Uploaded images are optimized and added immediately.');
      setStatus('Gallery image added', 'Uploaded image is saved in Media and added to this gallery.', false);
    })
    .catch((error: unknown) => {
      setStatus('Upload failed', error instanceof Error ? error.message : 'Unable to upload image.', true);
    });
});

let draggedGalleryAsset: { fieldId: string; assetId: string } | null = null;

function clearGalleryDropState(): void {
  document.querySelectorAll<HTMLElement>('.cms-gallery-item.is-dragging, .cms-gallery-item.is-drop-target').forEach((item) => {
    item.classList.remove('is-dragging', 'is-drop-target');
  });
}

document.addEventListener('dragstart', (event) => {
  const card = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-asset]');
  const preview = card?.closest<HTMLElement>('[data-gallery-preview]');
  const fieldId = preview?.dataset.galleryPreview;
  const assetId = card?.dataset.galleryAsset;
  if (!card || !fieldId || !assetId) {
    return;
  }

  draggedGalleryAsset = { fieldId, assetId };
  card.classList.add('is-dragging');
  event.dataTransfer?.setData('text/plain', assetId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
});

document.addEventListener('dragover', (event) => {
  const preview = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-preview]');
  if (!preview || !draggedGalleryAsset || preview.dataset.galleryPreview !== draggedGalleryAsset.fieldId) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  preview.querySelectorAll<HTMLElement>('.cms-gallery-item.is-drop-target').forEach((item) => {
    item.classList.remove('is-drop-target');
  });
  const targetCard = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-asset]');
  if (targetCard?.dataset.galleryAsset && targetCard.dataset.galleryAsset !== draggedGalleryAsset.assetId) {
    targetCard.classList.add('is-drop-target');
  }
});

document.addEventListener('drop', (event) => {
  const preview = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-preview]');
  if (!preview || !draggedGalleryAsset || preview.dataset.galleryPreview !== draggedGalleryAsset.fieldId) {
    return;
  }
  event.preventDefault();

  const targetCard = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-gallery-asset]');
  const beforeAssetId = targetCard?.dataset.galleryAsset;
  if (beforeAssetId === draggedGalleryAsset.assetId) {
    clearGalleryDropState();
    draggedGalleryAsset = null;
    return;
  }

  setGalleryValue(
    draggedGalleryAsset.fieldId,
    reorderGalleryAsset(getGalleryValue(draggedGalleryAsset.fieldId), draggedGalleryAsset.assetId, beforeAssetId ?? null),
  );
  draggedGalleryAsset = null;
  clearGalleryDropState();
});

document.addEventListener('dragend', () => {
  draggedGalleryAsset = null;
  clearGalleryDropState();
});

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-richtext-format][data-richtext-field]');
  if (!button?.dataset.richtextFormat || !button.dataset.richtextField) return;
  applyRichTextFormat(button.dataset.richtextField, button.dataset.richtextFormat);
});

document.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-richtext-insert-image]');
  if (!button?.dataset.richtextInsertImage) return;
  const fieldId = button.dataset.richtextInsertImage;
  const select = document.querySelector(`[data-richtext-media-select="${CSS.escape(fieldId)}"]`) as HTMLSelectElement | null;
  insertRichTextImage(fieldId, select?.value);
});

initializeSyncedGalleryImages();
renderIcons();

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
