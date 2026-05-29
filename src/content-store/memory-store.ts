import type { ContentItem, ContentStore, SaveDraftInput } from './types';

function itemKey(siteId: string, collectionId: string, itemId: string): string {
  return `${siteId}:${collectionId}:${itemId}`;
}

function cloneItem(item: ContentItem): ContentItem {
  return structuredClone(item);
}

export class MemoryContentStore implements ContentStore {
  private drafts = new Map<string, ContentItem>();
  private published = new Map<string, ContentItem>();

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
}
