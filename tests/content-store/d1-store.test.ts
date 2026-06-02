import { describe, expect, it } from 'vitest';
import { D1ContentStore } from '../../src/content-store/d1-store';

type StoredRow = Record<string, unknown>;

class FakeD1Statement {
  private bindings: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly rows: Map<string, StoredRow>,
  ) {}

  bind(...bindings: unknown[]): FakeD1Statement {
    this.bindings = bindings;
    return this;
  }

  async run(): Promise<void> {
    if (this.sql.includes('DELETE FROM page_region_values')) {
      const [siteId, pageId] = this.bindings;
      for (const [key, row] of this.rows.entries()) {
        if (key.startsWith('page:') && row.site_id === siteId && row.page_id === pageId && row.status === 'draft') {
          this.rows.delete(key);
        }
      }
      return;
    }

    if (this.sql.includes('INSERT OR REPLACE INTO page_region_values')) {
      const [siteId, pageId, regionId, valueHtml, href, elementType, size, updatedBy, updatedAt] = this.bindings;
      const status = this.sql.includes("'published'") ? 'published' : 'draft';
      this.rows.set(`page:${siteId}:${pageId}:${regionId}:${status}`, {
        site_id: siteId,
        page_id: pageId,
        region_id: regionId,
        status,
        value_html: valueHtml,
        href,
        element_type: elementType,
        size,
        updated_by: updatedBy,
        updated_at: updatedAt,
      });
      return;
    }

    if (this.sql.includes('INSERT OR REPLACE INTO media_assets')) {
      const [siteId, assetId, filename, width, height, variantsJson, altText, caption, createdAt, updatedAt] = this.bindings;
      this.rows.set(`media:${siteId}:${assetId}`, {
        site_id: siteId,
        asset_id: assetId,
        filename,
        content_type: 'image/webp',
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

    if (!this.sql.includes('INSERT OR REPLACE INTO content_items')) {
      throw new Error(`Unsupported run SQL: ${this.sql}`);
    }

    const [siteId, collectionId, itemId, valuesJson, extraSectionsJson, updatedBy, updatedAt] = this.bindings;
    const status = this.sql.includes("'published'") ? 'published' : 'draft';
    this.rows.set(`${siteId}:${collectionId}:${itemId}:${status}`, {
      site_id: siteId,
      collection_id: collectionId,
      item_id: itemId,
      status,
      values_json: valuesJson,
      extra_sections_json: extraSectionsJson,
      updated_by: updatedBy,
      updated_at: updatedAt,
    });
  }

  async first(): Promise<StoredRow | null> {
    const [siteId, collectionId, itemId, status] = this.bindings;
    return this.rows.get(`${siteId}:${collectionId}:${itemId}:${status}`) ?? null;
  }

  async all(): Promise<{ results: StoredRow[] }> {
    if (this.sql.includes('FROM media_assets')) {
      const [siteId] = this.bindings;
      return {
        results: [...this.rows.values()]
          .filter((row) => row.site_id === siteId && row.asset_id)
          .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))),
      };
    }

    if (this.sql.includes('FROM page_region_values')) {
      const [siteId, pageId, status] = this.bindings;
      return {
        results: [...this.rows.values()]
          .filter((row) => row.site_id === siteId && row.page_id === pageId && row.status === status)
          .sort((left, right) => String(left.region_id).localeCompare(String(right.region_id))),
      };
    }

    const [siteId] = this.bindings;
    return {
      results: [...this.rows.values()].filter(
        (row) => row.site_id === siteId && row.status === 'published',
      ),
    };
  }
}

class FakeD1Database {
  private rows = new Map<string, StoredRow>();

  prepare(sql: string): FakeD1Statement {
    return new FakeD1Statement(sql, this.rows);
  }
}

describe('D1ContentStore', () => {
  it('saves drafts, publishes them, and lists only published rows', async () => {
    const store = new D1ContentStore(new FakeD1Database() as unknown as D1Database);

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'AFT Fat Transfer' },
      extraSections: [{ type: 'recoveryTimeline', values: { intro: 'Week by week' } }],
      updatedBy: 'owner',
    });

    expect(await store.getPublishedItem('demo-site', 'procedures', 'aft')).toBeNull();

    const published = await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');
    const publishedItems = await store.listPublishedItems('demo-site');

    expect(published.values.title).toBe('AFT Fat Transfer');
    expect(publishedItems).toHaveLength(1);
    expect(publishedItems[0].extraSections[0].type).toBe('recoveryTimeline');
  });

  it('saves and publishes page region drafts', async () => {
    const store = new D1ContentStore(new FakeD1Database() as unknown as D1Database);

    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.heroHeading',
      value: 'Draft heading',
      elementType: 'h1',
      size: 'small',
      updatedBy: 'owner',
    });
    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.primaryCta',
      value: 'Book now',
      href: '/joe-plumbing/services',
      updatedBy: 'owner',
    });

    expect(await store.listPublishedPageRegions('joes-plumbing', 'home')).toEqual([]);
    expect(await store.listPageRegionDrafts('joes-plumbing', 'home')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          regionId: 'home.heroHeading',
          value: 'Draft heading',
          elementType: 'h1',
          size: 'small',
          status: 'draft',
        }),
        expect.objectContaining({
          regionId: 'home.primaryCta',
          value: 'Book now',
          href: '/joe-plumbing/services',
          status: 'draft',
        }),
      ]),
    );

    const published = await store.publishPageRegionDrafts('joes-plumbing', 'home', 'owner');

    expect(published).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          regionId: 'home.heroHeading',
          value: 'Draft heading',
          elementType: 'h1',
          size: 'small',
          status: 'published',
        }),
        expect.objectContaining({
          regionId: 'home.primaryCta',
          value: 'Book now',
          href: '/joe-plumbing/services',
          status: 'published',
        }),
      ]),
    );
    expect(await store.listPageRegionDrafts('joes-plumbing', 'home')).toEqual([]);
  });

  it('saves, lists, and updates media asset metadata', async () => {
    const store = new D1ContentStore(new FakeD1Database() as unknown as D1Database);
    const variants = {
      thumb: {
        r2Key: 'thumb.webp',
        url: '/api/media/asset-1/thumb',
        width: 360,
        height: 240,
        bytes: 12000,
        contentType: 'image/webp' as const,
      },
      card: {
        r2Key: 'card.webp',
        url: '/api/media/asset-1/card',
        width: 900,
        height: 600,
        bytes: 48000,
        contentType: 'image/webp' as const,
      },
      large: {
        r2Key: 'large.webp',
        url: '/api/media/asset-1/large',
        width: 1200,
        height: 800,
        bytes: 92000,
        contentType: 'image/webp' as const,
      },
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
});
