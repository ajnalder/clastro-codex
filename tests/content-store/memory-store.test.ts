import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';

describe('MemoryContentStore', () => {
  it('autosaves a draft without changing the published item', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'Draft title' },
      extraSections: [],
      updatedBy: 'owner',
    });

    expect(await store.getPublishedItem('demo-site', 'procedures', 'aft')).toBeNull();
    expect(await store.getDraftItem('demo-site', 'procedures', 'aft')).toMatchObject({
      values: { title: 'Draft title' },
      status: 'draft',
    });
  });

  it('publishes the current draft as the source item', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'Draft title' },
      extraSections: [{ type: 'recoveryTimeline', values: { intro: 'Week by week' } }],
      updatedBy: 'owner',
    });

    const published = await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');

    expect(published.status).toBe('published');
    expect(published.extraSections[0].type).toBe('recoveryTimeline');
    expect(await store.getPublishedItem('demo-site', 'procedures', 'aft')).toMatchObject({
      values: { title: 'Draft title' },
      status: 'published',
    });
  });
});
