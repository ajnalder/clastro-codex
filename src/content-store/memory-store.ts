import type { ContentItem, ContentStore, PageRegionContent, SaveDraftInput, SavePageRegionDraftInput } from './types';
import { normalizePageRegionFormat } from './page-region-format';

function itemKey(siteId: string, collectionId: string, itemId: string): string {
  return `${siteId}:${collectionId}:${itemId}`;
}

function pageRegionKey(siteId: string, pageId: string, regionId: string): string {
  return `${siteId}:${pageId}:${regionId}`;
}

function cloneItem(item: ContentItem): ContentItem {
  return structuredClone(item);
}

function clonePageRegion(region: PageRegionContent): PageRegionContent {
  return structuredClone(region);
}

export class MemoryContentStore implements ContentStore {
  private drafts = new Map<string, ContentItem>();
  private published = new Map<string, ContentItem>();
  private pageRegionDrafts = new Map<string, PageRegionContent>();
  private pageRegionPublished = new Map<string, PageRegionContent>();

  async saveDraft(input: SaveDraftInput): Promise<ContentItem> {
    const item: ContentItem = {
      ...input,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    this.drafts.set(itemKey(input.siteId, input.collectionId, input.itemId), cloneItem(item));
    return cloneItem(item);
  }

  async getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    const item = this.drafts.get(itemKey(siteId, collectionId, itemId));
    return item ? cloneItem(item) : null;
  }

  async getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    const item = this.published.get(itemKey(siteId, collectionId, itemId));
    return item ? cloneItem(item) : null;
  }

  async publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem> {
    const draft = await this.getDraftItem(siteId, collectionId, itemId);
    if (!draft) {
      throw new Error(`Draft not found for ${siteId}/${collectionId}/${itemId}`);
    }

    const published: ContentItem = {
      ...draft,
      status: 'published',
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.published.set(itemKey(siteId, collectionId, itemId), cloneItem(published));
    return cloneItem(published);
  }

  async listPublishedItems(siteId: string): Promise<ContentItem[]> {
    return [...this.published.values()]
      .filter((item) => item.siteId === siteId)
      .map(cloneItem);
  }

  async savePageRegionDraft(input: SavePageRegionDraftInput): Promise<PageRegionContent> {
    const format = normalizePageRegionFormat(input);
    const region: PageRegionContent = {
      ...input,
      ...format,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    this.pageRegionDrafts.set(pageRegionKey(input.siteId, input.pageId, input.regionId), clonePageRegion(region));
    return clonePageRegion(region);
  }

  async listPageRegionDrafts(siteId: string, pageId: string): Promise<PageRegionContent[]> {
    return [...this.pageRegionDrafts.values()]
      .filter((region) => region.siteId === siteId && region.pageId === pageId)
      .sort((left, right) => left.regionId.localeCompare(right.regionId))
      .map(clonePageRegion);
  }

  async listPublishedPageRegions(siteId: string, pageId: string): Promise<PageRegionContent[]> {
    return [...this.pageRegionPublished.values()]
      .filter((region) => region.siteId === siteId && region.pageId === pageId)
      .sort((left, right) => left.regionId.localeCompare(right.regionId))
      .map(clonePageRegion);
  }

  async publishPageRegionDrafts(siteId: string, pageId: string, updatedBy: string): Promise<PageRegionContent[]> {
    const drafts = await this.listPageRegionDrafts(siteId, pageId);
    const publishedAt = new Date().toISOString();
    const published = drafts.map((draft) => ({
      ...draft,
      status: 'published' as const,
      updatedBy,
      updatedAt: publishedAt,
    }));

    for (const region of published) {
      this.pageRegionPublished.set(pageRegionKey(region.siteId, region.pageId, region.regionId), clonePageRegion(region));
      this.pageRegionDrafts.delete(pageRegionKey(region.siteId, region.pageId, region.regionId));
    }

    return published.map(clonePageRegion);
  }
}
