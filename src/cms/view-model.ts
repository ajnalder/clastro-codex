import type { ContentContract, FieldDefinition } from '../contracts';
import type { CmsSampleItem } from './sample-content';

export interface CmsNavigationItem {
  id: string;
  label: string;
  itemCount: number;
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

export interface CmsViewModel {
  navigation: CmsNavigationItem[];
  activeCollection: CmsCollectionView | null;
  activeItem: CmsItemView | null;
}

interface Selection {
  selectedCollectionId?: string;
  selectedItemId?: string;
}

function stringifyValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function createFieldViews(fields: FieldDefinition[], values: Record<string, unknown>): CmsFieldView[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    primitive: field.primitive,
    required: field.required,
    value: stringifyValue(values[field.id]),
  }));
}

export function createCmsViewModel(
  contract: ContentContract,
  items: CmsSampleItem[],
  selection: Selection = {},
): CmsViewModel {
  const activeCollectionDefinition =
    contract.collections.find((collection) => collection.id === selection.selectedCollectionId) ??
    contract.collections[0] ??
    null;

  const navigation = contract.collections.map((collection) => ({
    id: collection.id,
    label: collection.label,
    itemCount: items.filter((item) => item.collectionId === collection.id).length,
    active: collection.id === activeCollectionDefinition?.id,
  }));

  if (!activeCollectionDefinition) {
    return {
      navigation,
      activeCollection: null,
      activeItem: null,
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
      navigation,
      activeCollection,
      activeItem: null,
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

  return {
    navigation,
    activeCollection,
    activeItem,
  };
}
