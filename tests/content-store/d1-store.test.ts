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
});
