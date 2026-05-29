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

  it('saves and lists page region drafts through the API', async () => {
    const store = new MemoryContentStore();
    const saveResponse = await handleApiRequest(
      new Request('https://cms.test/api/page-regions/draft', {
        method: 'POST',
        body: JSON.stringify({
          siteId: 'joes-plumbing',
          pageId: 'home',
          regionId: 'home.heroHeading',
          value: 'Draft homepage heading',
          updatedBy: 'owner',
        }),
      }),
      store,
    );
    const listResponse = await handleApiRequest(
      new Request('https://cms.test/api/page-regions/draft?siteId=joes-plumbing&pageId=home'),
      store,
    );

    expect(saveResponse.status).toBe(200);
    await expect(saveResponse.json()).resolves.toMatchObject({
      regionId: 'home.heroHeading',
      value: 'Draft homepage heading',
      status: 'draft',
    });
    await expect(listResponse.json()).resolves.toMatchObject({
      regions: [
        {
          regionId: 'home.heroHeading',
          value: 'Draft homepage heading',
          status: 'draft',
        },
      ],
    });
  });

  it('publishes page region drafts through the API', async () => {
    const store = new MemoryContentStore();
    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.heroHeading',
      value: 'Published homepage heading',
      updatedBy: 'owner',
    });

    const publishResponse = await handleApiRequest(
      new Request('https://cms.test/api/page-regions/publish', {
        method: 'POST',
        body: JSON.stringify({
          siteId: 'joes-plumbing',
          pageId: 'home',
          updatedBy: 'owner',
        }),
      }),
      store,
    );

    expect(publishResponse.status).toBe(200);
    await expect(publishResponse.json()).resolves.toMatchObject({
      regions: [
        {
          regionId: 'home.heroHeading',
          value: 'Published homepage heading',
          status: 'published',
        },
      ],
    });

    const publishedResponse = await handleApiRequest(
      new Request('https://cms.test/api/page-regions/published?siteId=joes-plumbing&pageId=home'),
      store,
    );
    await expect(publishedResponse.json()).resolves.toMatchObject({
      regions: [
        {
          regionId: 'home.heroHeading',
          value: 'Published homepage heading',
          status: 'published',
        },
      ],
    });
  });
});
