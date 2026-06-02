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

export function reorderGalleryAsset(
  value: GalleryFieldValue,
  assetId: string,
  beforeAssetId: string | null,
): GalleryFieldValue {
  if (!value.assetIds.includes(assetId)) {
    return normalizeGalleryFieldValue(value);
  }

  const assetIds = value.assetIds.filter((candidate) => candidate !== assetId);
  const nextIndex = beforeAssetId ? assetIds.indexOf(beforeAssetId) : -1;
  if (nextIndex < 0) {
    assetIds.push(assetId);
  } else {
    assetIds.splice(nextIndex, 0, assetId);
  }

  return normalizeGalleryFieldValue({ heroAssetId: value.heroAssetId, assetIds });
}

export function setGalleryHero(value: GalleryFieldValue, assetId: string): GalleryFieldValue {
  return normalizeGalleryFieldValue({
    heroAssetId: assetId,
    assetIds: value.assetIds,
  });
}

export function createImageValueFromGalleryHero(value: GalleryFieldValue, role = 'hero'): ImageFieldValue | null {
  const gallery = normalizeGalleryFieldValue(value);
  return gallery.heroAssetId ? { assetId: gallery.heroAssetId, role } : null;
}

export function createRichTextImageMarker(assetId: string, caption = ''): string {
  const captionPart = caption.trim() ? ` caption="${escapeMarkerValue(caption.trim())}"` : '';
  return `[media:image assetId="${escapeMarkerValue(assetId)}"${captionPart}]`;
}

export function insertRichTextImageMarker(value: string, marker: string, selectionStart: number): string {
  const safeIndex = Math.max(0, Math.min(selectionStart, value.length));
  const prefix = value.slice(0, safeIndex).trimEnd();
  const suffix = value.slice(safeIndex).trimStart();
  return `${prefix}\n\n${marker}\n\n${suffix}`.trim();
}
