import type { ContentContract, FieldDefinition } from '../contracts';
import type { MediaAsset } from '../media/types';
import {
  normalizeGalleryFieldValue,
  normalizeImageFieldValue,
  type GalleryFieldValue,
  type ImageFieldValue,
} from './media-field-values';
import { createSiteAccessView, type CmsSiteAccessView, type CmsUserAccount } from './auth';
import type { CmsSampleItem, CmsSamplePage, CmsSiteSettings } from './sample-content';

export interface CmsNavigationItem {
  id: string;
  label: string;
  itemCount: number;
  active: boolean;
}

export interface CmsPageNavigationItem {
  id: string;
  label: string;
  path: string;
  active: boolean;
}

export interface CmsFieldView {
  id: string;
  label: string;
  primitive: string;
  required: boolean;
  value: string;
  rawValue: unknown;
  imageValue: ImageFieldValue | null;
  galleryValue: GalleryFieldValue | null;
  mediaAsset: CmsMediaAssetView | null;
  gallery: CmsFieldGalleryView | null;
}

export interface CmsFieldGalleryView {
  heroAssetId: string | null;
  assets: CmsMediaAssetView[];
  missingAssetIds: string[];
}

export interface CmsExtraSectionView {
  id: string;
  label: string;
  fields: CmsFieldView[];
}

export interface CmsItemView {
  id: string;
  label: string;
  status: CmsSampleItem['status'];
  fields: CmsFieldView[];
  extraSections: CmsExtraSectionView[];
}

export interface CmsCollectionView {
  id: string;
  label: string;
  itemLabel: string;
  items: Array<{
    id: string;
    label: string;
    status: CmsSampleItem['status'];
    active: boolean;
  }>;
}

export interface CmsPageView {
  id: string;
  label: string;
  path: string;
  editHref: string;
  status: CmsSamplePage['status'];
  fields: CmsFieldView[];
}

export interface CmsMediaAssetView {
  assetId: string;
  filename: string;
  altText: string;
  caption: string;
  width: number;
  height: number;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  largeBytesLabel: string;
}

export interface CmsViewModel {
  activeMode: CmsMode;
  navigation: CmsNavigationItem[];
  pageNavigation: CmsPageNavigationItem[];
  activeCollection: CmsCollectionView | null;
  activeItem: CmsItemView | null;
  activePage: CmsPageView | null;
  mediaAssets: CmsMediaAssetView[];
  siteSettings: CmsSiteSettings | null;
  auth: CmsSiteAccessView;
}

export type CmsMode = 'collections' | 'pages' | 'media' | 'settings' | 'users';

interface Selection {
  mode?: CmsMode;
  selectedCollectionId?: string;
  selectedItemId?: string;
  selectedPageId?: string;
}

interface CmsViewModelOptions {
  siteSettings?: CmsSiteSettings;
  users?: CmsUserAccount[];
  currentUserId?: string;
}

const pageSettingsFields: FieldDefinition[] = [
  { id: 'name', label: 'Name', primitive: 'shortText', required: true },
  { id: 'metaTitle', label: 'Meta Title', primitive: 'shortText', required: true },
  { id: 'metaDescription', label: 'Meta Description', primitive: 'longText', required: true },
  { id: 'schema', label: 'Schema', primitive: 'longText', required: false },
];

function createEditHref(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}clastro-edit=1`;
}

function stringifyValue(value: unknown, field?: FieldDefinition): string {
  if (value == null) {
    return '';
  }
  if (
    field?.primitive === 'buttonLink' &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'label' in value &&
    'href' in value
  ) {
    const link = value as { label?: unknown; href?: unknown };
    return `${String(link.label ?? '')} -> ${String(link.href ?? '')}`;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function findMediaAsset(mediaAssets: CmsMediaAssetView[], assetId: string): CmsMediaAssetView | null {
  return mediaAssets.find((asset) => asset.assetId === assetId) ?? null;
}

function createFieldViews(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
  mediaAssets: CmsMediaAssetView[],
): CmsFieldView[] {
  return fields.map((field) => {
    const rawValue = values[field.id];
    const imageValue = field.primitive === 'image' ? normalizeImageFieldValue(rawValue) : null;
    const galleryValue =
      field.primitive === 'imageGallery' || field.primitive === 'sortableGallery'
        ? normalizeGalleryFieldValue(rawValue)
        : null;
    const galleryAssets =
      galleryValue?.assetIds
        .map((assetId) => findMediaAsset(mediaAssets, assetId))
        .filter((asset): asset is CmsMediaAssetView => asset !== null) ?? [];

    return {
      id: field.id,
      label: field.label,
      primitive: field.primitive,
      required: field.required,
      value: stringifyValue(rawValue, field),
      rawValue,
      imageValue,
      galleryValue,
      mediaAsset: imageValue ? findMediaAsset(mediaAssets, imageValue.assetId) : null,
      gallery: galleryValue
        ? {
            heroAssetId: galleryValue.heroAssetId,
            assets: galleryAssets,
            missingAssetIds: galleryValue.assetIds.filter((assetId) => !findMediaAsset(mediaAssets, assetId)),
          }
        : null,
    };
  });
}

function createPageView(
  pageDefinition: NonNullable<ContentContract['pages'][number]>,
  page: CmsSamplePage,
  mediaAssets: CmsMediaAssetView[],
): CmsPageView {
  return {
    id: page.pageId,
    label: page.label,
    path: pageDefinition.path,
    editHref: createEditHref(pageDefinition.path),
    status: page.status,
    fields: createFieldViews(pageSettingsFields, page.values, mediaAssets),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1000 * 1000) {
    return `${Math.round(bytes / 1000)} KB`;
  }
  return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
}

function createMediaAssetView(asset: MediaAsset): CmsMediaAssetView {
  return {
    assetId: asset.assetId,
    filename: asset.filename,
    altText: asset.altText,
    caption: asset.caption,
    width: asset.width,
    height: asset.height,
    previewUrl: asset.variants.thumb.url,
    previewWidth: asset.variants.thumb.width,
    previewHeight: asset.variants.thumb.height,
    largeBytesLabel: formatBytes(asset.variants.large.bytes),
  };
}

export function createCmsViewModel(
  contract: ContentContract,
  items: CmsSampleItem[],
  selection: Selection = {},
  pages: CmsSamplePage[] = [],
  mediaAssets: MediaAsset[] = [],
  options: CmsViewModelOptions = {},
): CmsViewModel {
  const activeMode = selection.mode ?? (selection.selectedPageId ? 'pages' : 'collections');
  const mediaAssetViews = mediaAssets.map(createMediaAssetView);
  const auth = createSiteAccessView(options.users ?? [], options.currentUserId ?? '');
  const siteSettings = options.siteSettings ?? null;

  const activeCollectionDefinition =
    contract.collections.find((collection) => collection.id === selection.selectedCollectionId) ??
    contract.collections[0] ??
    null;
  const activePageDefinition =
    contract.pages.find((page) => page.id === selection.selectedPageId) ?? contract.pages[0] ?? null;
  const selectedPage = activePageDefinition
    ? pages.find((page) => page.pageId === activePageDefinition.id) ?? null
    : null;

  const navigation = contract.collections.map((collection) => ({
    id: collection.id,
    label: collection.label,
    itemCount: items.filter((item) => item.collectionId === collection.id).length,
    active: activeMode === 'collections' && collection.id === activeCollectionDefinition?.id,
  }));

  const pageNavigation = contract.pages.map((page) => ({
    id: page.id,
    label: page.label,
    path: page.path,
    active: activeMode === 'pages' && page.id === activePageDefinition?.id,
  }));

  if (activeMode === 'media' || activeMode === 'settings' || activeMode === 'users') {
    return {
      activeMode,
      navigation,
      pageNavigation,
      activeCollection: null,
      activeItem: null,
      activePage: null,
      mediaAssets: mediaAssetViews,
      siteSettings,
      auth,
    };
  }

  if (!activeCollectionDefinition) {
    return {
      activeMode,
      navigation,
      pageNavigation,
      activeCollection: null,
      activeItem: null,
      activePage: activePageDefinition && selectedPage ? createPageView(activePageDefinition, selectedPage, mediaAssetViews) : null,
      mediaAssets: mediaAssetViews,
      siteSettings,
      auth,
    };
  }

  const collectionItems = items.filter((item) => item.collectionId === activeCollectionDefinition.id);
  const selectedItem =
    collectionItems.find((item) => item.itemId === selection.selectedItemId) ?? collectionItems[0] ?? null;

  const activeCollection: CmsCollectionView = {
    id: activeCollectionDefinition.id,
    label: activeCollectionDefinition.label,
    itemLabel: activeCollectionDefinition.itemLabel,
    items: collectionItems.map((item) => ({
      id: item.itemId,
      label: item.label,
      status: item.status,
      active: item.itemId === selectedItem?.itemId,
    })),
  };

  if (!selectedItem) {
    return {
      activeMode,
      navigation,
      pageNavigation,
      activeCollection,
      activeItem: null,
      activePage: null,
      mediaAssets: mediaAssetViews,
      siteSettings,
      auth,
    };
  }

  const activeItem: CmsItemView = {
    id: selectedItem.itemId,
    label: selectedItem.label,
    status: selectedItem.status,
    fields: createFieldViews(activeCollectionDefinition.coreFields, selectedItem.values, mediaAssetViews),
    extraSections: selectedItem.extraSections.map((section) => {
      const definition = activeCollectionDefinition.extraSectionTypes.find((candidate) => candidate.id === section.type);
      return {
        id: section.type,
        label: definition?.label ?? section.type,
        fields: createFieldViews(definition?.fields ?? [], section.values, mediaAssetViews),
      };
    }),
  };
  const activePage: CmsPageView | null =
    activePageDefinition && selectedPage
      ? createPageView(activePageDefinition, selectedPage, mediaAssetViews)
      : null;

  return {
    activeMode,
    navigation,
    pageNavigation,
    activeCollection,
    activeItem,
    activePage,
    mediaAssets: mediaAssetViews,
    siteSettings,
    auth,
  };
}
