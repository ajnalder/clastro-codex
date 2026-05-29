import type { ContentItem, ContentStore, ExtraSectionValue, JsonObject, SaveDraftInput } from './types';

function now(): string {
  return new Date().toISOString();
}

function parseJsonObject(value: string): JsonObject {
  return JSON.parse(value) as JsonObject;
}

function parseExtraSections(value: string): ExtraSectionValue[] {
  return JSON.parse(value) as ExtraSectionValue[];
}

function rowToItem(row: Record<string, unknown>): ContentItem {
  return {
    siteId: String(row.site_id),
    collectionId: String(row.collection_id),
    itemId: String(row.item_id),
    status: row.status === 'published' ? 'published' : 'draft',
    values: parseJsonObject(String(row.values_json)),
    extraSections: parseExtraSections(String(row.extra_sections_json)),
    updatedBy: String(row.updated_by),
    updatedAt: String(row.updated_at),
  };
}

export class D1ContentStore implements ContentStore {
  constructor(private readonly db: D1Database) {}

  async saveDraft(input: SaveDraftInput): Promise<ContentItem> {
    const updatedAt = now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO content_items
          (site_id, collection_id, item_id, status, values_json, extra_sections_json, updated_by, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
      )
      .bind(
        input.siteId,
        input.collectionId,
        input.itemId,
        JSON.stringify(input.values),
        JSON.stringify(input.extraSections),
        input.updatedBy,
        updatedAt,
      )
      .run();

    return {
      ...input,
      status: 'draft',
      updatedAt,
    };
  }

  async getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    return this.getItem(siteId, collectionId, itemId, 'draft');
  }

  async getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    return this.getItem(siteId, collectionId, itemId, 'published');
  }

  async publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem> {
    const draft = await this.getDraftItem(siteId, collectionId, itemId);
    if (!draft) {
      throw new Error(`Draft not found for ${siteId}/${collectionId}/${itemId}`);
    }

    const updatedAt = now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO content_items
          (site_id, collection_id, item_id, status, values_json, extra_sections_json, updated_by, updated_at)
        VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`,
      )
      .bind(
        siteId,
        collectionId,
        itemId,
        JSON.stringify(draft.values),
        JSON.stringify(draft.extraSections),
        updatedBy,
        updatedAt,
      )
      .run();

    return {
      ...draft,
      status: 'published',
      updatedBy,
      updatedAt,
    };
  }

  async listPublishedItems(siteId: string): Promise<ContentItem[]> {
    const result = await this.db
      .prepare(`SELECT * FROM content_items WHERE site_id = ? AND status = 'published' ORDER BY collection_id, item_id`)
      .bind(siteId)
      .all<Record<string, unknown>>();

    return result.results.map(rowToItem);
  }

  private async getItem(
    siteId: string,
    collectionId: string,
    itemId: string,
    status: 'draft' | 'published',
  ): Promise<ContentItem | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM content_items
        WHERE site_id = ? AND collection_id = ? AND item_id = ? AND status = ?`,
      )
      .bind(siteId, collectionId, itemId, status)
      .first<Record<string, unknown>>();

    return row ? rowToItem(row) : null;
  }
}
