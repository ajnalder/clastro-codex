import type { ImageSize, MediaVariantId, MediaVariantManifest, PlannedMediaVariant } from './types';

const targets: Array<{ id: MediaVariantId; maxWidth: number; quality: number }> = [
  { id: 'thumb', maxWidth: 360, quality: 0.78 },
  { id: 'card', maxWidth: 900, quality: 0.82 },
  { id: 'large', maxWidth: 1800, quality: 0.84 },
];

const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isSupportedImageType(contentType: string): boolean {
  return supportedImageTypes.has(contentType);
}

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
