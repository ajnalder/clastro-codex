import type { ContentItem, ContentStore } from './types';

export interface PublishedSnapshot {
  siteId: string;
  generatedAt: string;
  collections: Record<string, Record<string, ContentItem>>;
}

export async function createPublishedSnapshot(store: ContentStore, siteId: string): Promise<PublishedSnapshot> {
  const items = await store.listPublishedItems(siteId);
  const collections: PublishedSnapshot['collections'] = {};

  for (const item of items) {
    collections[item.collectionId] ??= {};
    collections[item.collectionId][item.itemId] = item;
  }

  return {
    siteId,
    generatedAt: new Date().toISOString(),
    collections,
  };
}
