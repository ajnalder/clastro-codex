export type ContentStatus = 'draft' | 'published';

export type JsonObject = Record<string, unknown>;

export interface ExtraSectionValue {
  type: string;
  values: JsonObject;
}

export interface ContentItem {
  siteId: string;
  collectionId: string;
  itemId: string;
  values: JsonObject;
  extraSections: ExtraSectionValue[];
  status: ContentStatus;
  updatedBy: string;
  updatedAt: string;
}

export interface PageRegionContent {
  siteId: string;
  pageId: string;
  regionId: string;
  value: string;
  status: ContentStatus;
  updatedBy: string;
  updatedAt: string;
}

export interface SaveDraftInput {
  siteId: string;
  collectionId: string;
  itemId: string;
  values: JsonObject;
  extraSections: ExtraSectionValue[];
  updatedBy: string;
}

export interface SavePageRegionDraftInput {
  siteId: string;
  pageId: string;
  regionId: string;
  value: string;
  updatedBy: string;
}

export interface ContentStore {
  saveDraft(input: SaveDraftInput): Promise<ContentItem>;
  getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null>;
  getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null>;
  publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem>;
  listPublishedItems(siteId: string): Promise<ContentItem[]>;
  savePageRegionDraft(input: SavePageRegionDraftInput): Promise<PageRegionContent>;
  listPageRegionDrafts(siteId: string, pageId: string): Promise<PageRegionContent[]>;
  listPublishedPageRegions(siteId: string, pageId: string): Promise<PageRegionContent[]>;
  publishPageRegionDrafts(siteId: string, pageId: string, updatedBy: string): Promise<PageRegionContent[]>;
}
