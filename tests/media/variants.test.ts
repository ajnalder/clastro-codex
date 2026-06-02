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
