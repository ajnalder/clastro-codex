export interface StoredMediaObject {
  body: Blob;
  contentType: string;
}

export interface MediaStorage {
  put(key: string, body: Blob): Promise<void>;
  get(key: string): Promise<StoredMediaObject | null>;
}

export class MemoryMediaStorage implements MediaStorage {
  private objects = new Map<string, StoredMediaObject>();

  async put(key: string, body: Blob): Promise<void> {
    this.objects.set(key, { body, contentType: body.type || 'application/octet-stream' });
  }

  async get(key: string): Promise<StoredMediaObject | null> {
    return this.objects.get(key) ?? null;
  }
}

export class R2MediaStorage implements MediaStorage {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, body: Blob): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType: body.type || 'image/webp' },
    });
  }

  async get(key: string): Promise<StoredMediaObject | null> {
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }
    return {
      body: await object.blob(),
      contentType: object.httpMetadata?.contentType ?? 'image/webp',
    };
  }
}
