export const pageRegionElementTypes = ['p', 'h1', 'h2', 'h3', 'blockquote', 'span', 'strong'] as const;
export const pageRegionSizes = ['default', 'small', 'large'] as const;

export type PageRegionElementType = (typeof pageRegionElementTypes)[number];
export type PageRegionSize = (typeof pageRegionSizes)[number];

export interface PageRegionFormatInput {
  elementType?: unknown;
  size?: unknown;
}

export interface PageRegionFormat {
  elementType: PageRegionElementType;
  size: PageRegionSize;
}

function isPageRegionElementType(value: unknown): value is PageRegionElementType {
  return typeof value === 'string' && pageRegionElementTypes.includes(value as PageRegionElementType);
}

function isPageRegionSize(value: unknown): value is PageRegionSize {
  return typeof value === 'string' && pageRegionSizes.includes(value as PageRegionSize);
}

export function normalizePageRegionFormat(input: PageRegionFormatInput): PageRegionFormat {
  return {
    elementType: isPageRegionElementType(input.elementType) ? input.elementType : 'p',
    size: isPageRegionSize(input.size) ? input.size : 'default',
  };
}

export function resolvePageRegionFormatChange(
  current: PageRegionFormatInput,
  change: PageRegionFormatInput,
): PageRegionFormat {
  const normalizedCurrent = normalizePageRegionFormat(current);
  return normalizePageRegionFormat({
    elementType: change.elementType ?? normalizedCurrent.elementType,
    size: change.size ?? normalizedCurrent.size,
  });
}
