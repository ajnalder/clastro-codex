import { plumberItems, plumberPages, type CmsSampleItem, type CmsSamplePage } from '../cms/sample-content';

export interface JoeLink {
  label: string;
  href: string;
}

export function getJoePage(pageId: string): CmsSamplePage {
  const page = plumberPages.find((candidate) => candidate.pageId === pageId);
  if (!page) {
    throw new Error(`Joe's Plumbing page not found: ${pageId}`);
  }
  return page;
}

export function getPageString(page: CmsSamplePage, key: string): string {
  const value = page.values[key];
  return typeof value === 'string' ? value : '';
}

export function getPageLink(page: CmsSamplePage, key: string): JoeLink {
  const value = page.values[key];
  if (value && typeof value === 'object' && !Array.isArray(value) && 'label' in value && 'href' in value) {
    const link = value as { label?: unknown; href?: unknown };
    return {
      label: String(link.label ?? ''),
      href: String(link.href ?? '#'),
    };
  }
  return {
    label: '',
    href: '#',
  };
}

export function getCollectionString(item: CmsSampleItem, key: string): string {
  const value = item.values[key];
  return typeof value === 'string' ? value : '';
}

export const joeServices = plumberItems.filter((item) => item.collectionId === 'services');
export const joeBlogPosts = plumberItems.filter((item) => item.collectionId === 'blogPosts');

