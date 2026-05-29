import type {
  ContentItem,
  ContentStore,
  ExtraSectionValue,
  JsonObject,
  PageRegionContent,
  SaveDraftInput,
  SavePageRegionDraftInput,
} from './types';
import { normalizePageRegionFormat } from './page-region-format';

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

function rowToPageRegion(row: Record<string, unknown>): PageRegionContent {
  const format = normalizePageRegionFormat({
    elementType: row.element_type,
    size: row.size,
  });
  return {
    siteId: String(row.site_id),
    pageId: String(row.page_id),
    regionId: String(row.region_id),
    status: row.status === 'published' ? 'published' : 'draft',
    value: String(row.value_html),
    elementType: format.elementType,
    size: format.size,
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

  async savePageRegionDraft(input: SavePageRegionDraftInput): Promise<PageRegionContent> {
    const updatedAt = now();
    const format = normalizePageRegionFormat(input);
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO page_region_values
          (site_id, page_id, region_id, status, value_html, element_type, size, updated_by, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
      )
      .bind(input.siteId, input.pageId, input.regionId, input.value, format.elementType, format.size, input.updatedBy, updatedAt)
      .run();

    return {
      ...input,
      ...format,
      status: 'draft',
      updatedAt,
    };
  }

  async listPageRegionDrafts(siteId: string, pageId: string): Promise<PageRegionContent[]> {
    return this.listPageRegions(siteId, pageId, 'draft');
  }

  async listPublishedPageRegions(siteId: string, pageId: string): Promise<PageRegionContent[]> {
    return this.listPageRegions(siteId, pageId, 'published');
  }

  async publishPageRegionDrafts(siteId: string, pageId: string, updatedBy: string): Promise<PageRegionContent[]> {
    const drafts = await this.listPageRegionDrafts(siteId, pageId);
    const updatedAt = now();

    for (const draft of drafts) {
      await this.db
        .prepare(
          `INSERT OR REPLACE INTO page_region_values
            (site_id, page_id, region_id, status, value_html, element_type, size, updated_by, updated_at)
          VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
        )
        .bind(siteId, pageId, draft.regionId, draft.value, draft.elementType, draft.size, updatedBy, updatedAt)
        .run();
    }

    await this.db
      .prepare(
        `DELETE FROM page_region_values
        WHERE site_id = ? AND page_id = ? AND status = 'draft'`,
      )
      .bind(siteId, pageId)
      .run();

    return this.listPublishedPageRegions(siteId, pageId);
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

  private async listPageRegions(
    siteId: string,
    pageId: string,
    status: 'draft' | 'published',
  ): Promise<PageRegionContent[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM page_region_values
        WHERE site_id = ? AND page_id = ? AND status = ?
        ORDER BY region_id`,
      )
      .bind(siteId, pageId, status)
      .all<Record<string, unknown>>();

    return result.results.map(rowToPageRegion);
  }
}
