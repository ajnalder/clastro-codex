import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';
import { createPublishedSnapshot } from '../../src/content-store/snapshot';

describe('createPublishedSnapshot', () => {
  it('exports only published items for the requested site', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'AFT Fat Transfer' },
      extraSections: [],
      updatedBy: 'owner',
    });
    await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');
    await store.saveDraft({
      siteId: 'other-site',
      collectionId: 'procedures',
      itemId: 'other',
      values: { title: 'Other' },
      extraSections: [],
      updatedBy: 'owner',
    });
    await store.publishDraft('other-site', 'procedures', 'other', 'owner');

    const snapshot = await createPublishedSnapshot(store, 'demo-site');

    expect(snapshot.siteId).toBe('demo-site');
    expect(snapshot.collections.procedures.aft.values.title).toBe('AFT Fat Transfer');
    expect(snapshot.collections.procedures.other).toBeUndefined();
  });
});
