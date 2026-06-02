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
    expect(insertRichTextImageMarker('Before after', marker, 7)).toBe(
      'Before\n\n[media:image assetId="asset-1" caption="Pipe diagram"]\n\nafter',
    );
  });
});
