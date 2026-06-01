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

  it('saves page region drafts separately from published page regions', async () => {
    const store = new MemoryContentStore();

    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.heroHeading',
      value: 'Draft headline',
      elementType: 'h1',
      size: 'small',
      updatedBy: 'owner',
    });
    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.primaryCta',
      value: 'Book now',
      href: '/joe-plumbing/services',
      updatedBy: 'owner',
    });

    expect(await store.listPublishedPageRegions('joes-plumbing', 'home')).toEqual([]);
    expect(await store.listPageRegionDrafts('joes-plumbing', 'home')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pageId: 'home',
          regionId: 'home.heroHeading',
          value: 'Draft headline',
          elementType: 'h1',
          size: 'small',
          status: 'draft',
        }),
        expect.objectContaining({
          pageId: 'home',
          regionId: 'home.primaryCta',
          value: 'Book now',
          href: '/joe-plumbing/services',
          status: 'draft',
        }),
      ]),
    );
  });

  it('publishes all current page region drafts for a page', async () => {
    const store = new MemoryContentStore();

    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.heroHeading',
      value: 'Published headline',
      elementType: 'h1',
      size: 'small',
      updatedBy: 'owner',
    });
    await store.savePageRegionDraft({
      siteId: 'joes-plumbing',
      pageId: 'home',
      regionId: 'home.heroIntro',
      value: 'Published intro',
      elementType: 'p',
      size: 'default',
      updatedBy: 'owner',
    });

    const published = await store.publishPageRegionDrafts('joes-plumbing', 'home', 'owner');

    expect(published).toHaveLength(2);
    expect(await store.listPublishedPageRegions('joes-plumbing', 'home')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          regionId: 'home.heroHeading',
          value: 'Published headline',
          elementType: 'h1',
          size: 'small',
          status: 'published',
        }),
        expect.objectContaining({
          regionId: 'home.heroIntro',
          value: 'Published intro',
          elementType: 'p',
          size: 'default',
          status: 'published',
        }),
      ]),
    );
    expect(await store.listPageRegionDrafts('joes-plumbing', 'home')).toEqual([]);
  });
});
