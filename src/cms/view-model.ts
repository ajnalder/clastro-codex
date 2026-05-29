import type { ContentContract, FieldDefinition } from '../contracts';
import type { CmsSampleItem, CmsSamplePage } from './sample-content';

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

export interface CmsViewModel {
  activeMode: 'collections' | 'pages';
  navigation: CmsNavigationItem[];
  pageNavigation: CmsPageNavigationItem[];
  activeCollection: CmsCollectionView | null;
  activeItem: CmsItemView | null;
  activePage: CmsPageView | null;
}

interface Selection {
  mode?: 'collections' | 'pages';
  selectedCollectionId?: string;
  selectedItemId?: string;
  selectedPageId?: string;
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

function createFieldViews(fields: FieldDefinition[], values: Record<string, unknown>): CmsFieldView[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    primitive: field.primitive,
    required: field.required,
    value: stringifyValue(values[field.id], field),
  }));
}

function createPageView(pageDefinition: NonNullable<ContentContract['pages'][number]>, page: CmsSamplePage): CmsPageView {
  return {
    id: page.pageId,
    label: page.label,
    path: pageDefinition.path,
    editHref: createEditHref(pageDefinition.path),
    status: page.status,
    fields: createFieldViews(pageSettingsFields, page.values),
  };
}

export function createCmsViewModel(
  contract: ContentContract,
  items: CmsSampleItem[],
  selection: Selection = {},
  pages: CmsSamplePage[] = [],
): CmsViewModel {
  const activeMode = selection.mode ?? (selection.selectedPageId ? 'pages' : 'collections');

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

  if (!activeCollectionDefinition) {
    return {
      activeMode,
      navigation,
      pageNavigation,
      activeCollection: null,
      activeItem: null,
      activePage: activePageDefinition && selectedPage ? createPageView(activePageDefinition, selectedPage) : null,
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
    };
  }

  const activeItem: CmsItemView = {
    id: selectedItem.itemId,
    label: selectedItem.label,
    status: selectedItem.status,
    fields: createFieldViews(activeCollectionDefinition.coreFields, selectedItem.values),
    extraSections: selectedItem.extraSections.map((section) => {
      const definition = activeCollectionDefinition.extraSectionTypes.find((candidate) => candidate.id === section.type);
      return {
        id: section.type,
        label: definition?.label ?? section.type,
        fields: createFieldViews(definition?.fields ?? [], section.values),
      };
    }),
  };
  const activePage: CmsPageView | null =
    activePageDefinition && selectedPage
      ? createPageView(activePageDefinition, selectedPage)
      : null;

  return {
    activeMode,
    navigation,
    pageNavigation,
    activeCollection,
    activeItem,
    activePage,
  };
}
