import type { MediaVariantId } from './types';
import { isSupportedImageType, planImageVariants } from './variants';

export interface OptimizedUpload {
  filename: string;
  width: number;
  height: number;
  blobs: Record<MediaVariantId, Blob>;
  bytesByVariant: Record<MediaVariantId, number>;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Unable to convert image to WebP'));
    }, 'image/webp', quality);
  });
}

function createWebpFilename(filename: string): string {
  const basename = filename.replace(/\.[^.]+$/, '') || 'image';
  return `${basename}.webp`;
}

export async function optimizeImageFile(file: File): Promise<OptimizedUpload> {
  if (!isSupportedImageType(file.type)) {
    throw new Error('Upload a JPEG, PNG, or WebP image.');
  }

  const bitmap = await createImageBitmap(file);
  const sourceSize = { width: bitmap.width, height: bitmap.height };
  const variants = planImageVariants(sourceSize);
  const blobs = {} as Record<MediaVariantId, Blob>;
  const bytesByVariant = {} as Record<MediaVariantId, number>;

  for (const variant of variants) {
    const canvas = document.createElement('canvas');
    canvas.width = variant.width;
    canvas.height = variant.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare image canvas');
    }
    context.drawImage(bitmap, 0, 0, variant.width, variant.height);
    const blob = await canvasToBlob(canvas, variant.quality);
    blobs[variant.id] = blob;
    bytesByVariant[variant.id] = blob.size;
  }

  bitmap.close();

  return {
    filename: createWebpFilename(file.name),
    width: sourceSize.width,
    height: sourceSize.height,
    blobs,
    bytesByVariant,
  };
}
