import { describe, expect, it } from 'vitest';
import { MemoryMediaStorage } from '../../src/media/storage';

describe('MemoryMediaStorage', () => {
  it('stores and reads optimized variant blobs by key', async () => {
    const storage = new MemoryMediaStorage();
    const body = new Blob(['webp-bytes'], { type: 'image/webp' });

    await storage.put('sites/demo/media/asset/thumb.webp', body);
    const stored = await storage.get('sites/demo/media/asset/thumb.webp');

    expect(stored?.contentType).toBe('image/webp');
    expect(await stored?.body.text()).toBe('webp-bytes');
  });
});
