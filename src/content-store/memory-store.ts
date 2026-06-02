import type { MediaAsset, SaveMediaAssetInput, UpdateMediaAssetInput } from '../media/types';
import type { ContentItem, ContentStore, PageRegionContent, SaveDraftInput, SavePageRegionDraftInput } from './types';
import { normalizePageRegionFormat } from './page-region-format';

function itemKey(siteId: string, collectionId: string, itemId: string): string {
  return `${siteId}:${collectionId}:${itemId}`;
}

function pageRegionKey(siteId: string, pageId: string, regionId: string): string {
  return `${siteId}:${pageId}:${regionId}`;
}

function mediaKey(siteId: string, assetId: string): string {
  return `${siteId}:${assetId}`;
}

function cloneItem(item: ContentItem): ContentItem {
  return structuredClone(item);
}

function clonePageRegion(region: PageRegionContent): PageRegionContent {
  return structuredClone(region);
}

function cloneMediaAsset(asset: MediaAsset): MediaAsset {
  return structuredClone(asset);
}

export class MemoryContentStore implements ContentStore {
  private drafts = new Map<string, ContentItem>();
  private published = new Map<string, ContentItem>();
  private pageRegionDrafts = new Map<string, PageRegionContent>();
  private pageRegionPublished = new Map<string, PageRegionContent>();
  private mediaAssets = new Map<string, MediaAsset>();

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

  async saveMediaAsset(input: SaveMediaAssetInput): Promise<MediaAsset> {
    const now = new Date().toISOString();
    const asset: MediaAsset = {
      ...input,
      assetId: input.assetId ?? crypto.randomUUID(),
      caption: input.caption ?? '',
      contentType: 'image/webp',
      createdAt: now,
      updatedAt: now,
    };
    this.mediaAssets.set(mediaKey(asset.siteId, asset.assetId), cloneMediaAsset(asset));
    return cloneMediaAsset(asset);
  }

  async listMediaAssets(siteId: string): Promise<MediaAsset[]> {
    return [...this.mediaAssets.values()]
      .filter((asset) => asset.siteId === siteId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(cloneMediaAsset);
  }

  async updateMediaAssetMetadata(input: UpdateMediaAssetInput): Promise<MediaAsset> {
    const key = mediaKey(input.siteId, input.assetId);
    const existing = this.mediaAssets.get(key);
    if (!existing) {
      throw new Error(`Media asset not found for ${input.siteId}/${input.assetId}`);
    }
    const updated: MediaAsset = {
      ...existing,
      altText: input.altText,
      caption: input.caption,
      updatedAt: new Date().toISOString(),
    };
    this.mediaAssets.set(key, cloneMediaAsset(updated));
    return cloneMediaAsset(updated);
  }
}
