import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';
import { MemoryMediaStorage } from '../../src/media/storage';
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
          href: '/joe-plumbing/services',
          elementType: 'h1',
          size: 'small',
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
      href: '/joe-plumbing/services',
      elementType: 'h1',
      size: 'small',
      status: 'draft',
    });
    await expect(listResponse.json()).resolves.toMatchObject({
      regions: [
        {
          regionId: 'home.heroHeading',
          value: 'Draft homepage heading',
          href: '/joe-plumbing/services',
          elementType: 'h1',
          size: 'small',
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
      elementType: 'h1',
      size: 'small',
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
          elementType: 'h1',
          size: 'small',
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
          elementType: 'h1',
          size: 'small',
          status: 'published',
        },
      ],
    });
  });

  it('creates, lists, updates, and serves media assets through the API', async () => {
    const store = new MemoryContentStore();
    const storage = new MemoryMediaStorage();
    const form = new FormData();
    form.set('siteId', 'joes-plumbing');
    form.set('filename', 'van.webp');
    form.set('altText', "Joe's Plumbing van");
    form.set('caption', 'Service van');
    form.set('width', '1200');
    form.set('height', '800');
    form.set('bytesByVariant', JSON.stringify({ thumb: 10, card: 20, large: 30 }));
    form.set('thumb', new Blob(['thumb'], { type: 'image/webp' }));
    form.set('card', new Blob(['card'], { type: 'image/webp' }));
    form.set('large', new Blob(['large'], { type: 'image/webp' }));

    const createResponse = await handleApiRequest(
      new Request('https://cms.test/api/media', { method: 'POST', body: form }),
      store,
      storage,
    );
    const created = await createResponse.json() as { assetId: string };
    const updateResponse = await handleApiRequest(
      new Request(`https://cms.test/api/media/${created.assetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          siteId: 'joes-plumbing',
          altText: 'Updated van alt',
          caption: 'Updated van caption',
        }),
      }),
      store,
      storage,
    );
    const listResponse = await handleApiRequest(
      new Request('https://cms.test/api/media?siteId=joes-plumbing'),
      store,
      storage,
    );
    const variantResponse = await handleApiRequest(
      new Request(`https://cms.test/api/media/${created.assetId}/thumb?siteId=joes-plumbing`),
      store,
      storage,
    );

    expect(createResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          filename: 'van.webp',
          altText: 'Updated van alt',
          caption: 'Updated van caption',
        }),
      ],
    });
    expect(variantResponse.status).toBe(200);
    expect(variantResponse.headers.get('content-type')).toBe('image/webp');
    await expect(variantResponse.text()).resolves.toBe('thumb');
  });
});
