export type MediaVariantId = 'thumb' | 'card' | 'large';

export interface ImageSize {
  width: number;
  height: number;
}

export interface PlannedMediaVariant extends ImageSize {
  id: MediaVariantId;
  quality: number;
}

export interface MediaVariant extends ImageSize {
  r2Key: string;
  url: string;
  bytes: number;
  contentType: 'image/webp';
}

export type MediaVariantManifest = Record<MediaVariantId, MediaVariant>;

export interface MediaAsset {
  siteId: string;
  assetId: string;
  filename: string;
  altText: string;
  caption: string;
  contentType: 'image/webp';
  width: number;
  height: number;
  variants: MediaVariantManifest;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMediaAssetInput {
  siteId: string;
  assetId?: string;
  filename: string;
  altText: string;
  caption?: string;
  width: number;
  height: number;
  variants: MediaVariantManifest;
}

export interface UpdateMediaAssetInput {
  siteId: string;
  assetId: string;
  altText: string;
  caption: string;
}
