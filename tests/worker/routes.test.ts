import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';
import { handleApiRequest } from '../../src/worker/routes';

describe('handleApiRequest', () => {
  it('saves a draft through the API', async () => {
    const store = new MemoryContentStore();
    const response = await handleApiRequest(
      new Request('https://cms.test/api/items/draft', {
        method: 'POST',
        body: JSON.stringify({
          siteId: 'demo-site',
          collectionId: 'procedures',
          itemId: 'aft',
          values: { title: 'AFT Fat Transfer' },
          extraSections: [],
          updatedBy: 'owner',
        }),
      }),
      store,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'draft',
      values: { title: 'AFT Fat Transfer' },
    });
  });

  it('exports a published snapshot through the API', async () => {
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

    const response = await handleApiRequest(new Request('https://cms.test/api/snapshot?siteId=demo-site'), store);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      siteId: 'demo-site',
      collections: {
        procedures: {
          aft: {
            values: { title: 'AFT Fat Transfer' },
          },
        },
      },
    });
  });
});
