import { describe, expect, it } from 'vitest';
import { plasticSurgeonContract, plumberContract } from '../../src/contracts';
import {
  plasticSurgeonItems,
  plasticSurgeonPages,
  plumberItems,
  plumberMediaAssets,
  plumberPages,
} from '../../src/cms/sample-content';
import { createCmsViewModel } from '../../src/cms/view-model';
import { demoSiteSettings, demoUsers } from '../../src/cms/sample-content';

describe('createCmsViewModel', () => {
  it('creates collection navigation from the contract labels', () => {
    const model = createCmsViewModel(plasticSurgeonContract, plasticSurgeonItems, {
      selectedCollectionId: 'procedures',
      selectedItemId: 'aft',
    });

    expect(model.navigation.map((item) => item.label)).toEqual(['Procedures', 'Blog']);
    expect(model.activeCollection?.label).toBe('Procedures');
  });

  it('shows item-specific extra sections only for the selected item', () => {
    const model = createCmsViewModel(plasticSurgeonContract, plasticSurgeonItems, {
      selectedCollectionId: 'procedures',
      selectedItemId: 'aft',
    });

    expect(model.activeItem?.extraSections.map((section) => section.label)).toEqual([
      'Recovery Timeline',
      'Comparison Table',
    ]);
  });

  it('supports a different client model using the same plumbing', () => {
    const model = createCmsViewModel(plumberContract, plumberItems, {
      selectedCollectionId: 'services',
      selectedItemId: 'emergency',
    });

    expect(model.activeCollection?.itemLabel).toBe('Service');
    expect(model.activeItem?.extraSections.map((section) => section.label)).toEqual([
      'Service Area List',
      'Price Guide',
      'Urgency Callout',
    ]);
  });

  it('creates a static page settings view without exposing WYSIWYG page regions', () => {
    const model = createCmsViewModel(
      plasticSurgeonContract,
      plasticSurgeonItems,
      { mode: 'pages', selectedPageId: 'home' },
      plasticSurgeonPages,
    );

    expect(model.activeMode).toBe('pages');
    expect(model.pageNavigation.map((page) => page.label)).toEqual(['Home']);
    expect(model.navigation.some((item) => item.active)).toBe(false);
    expect(model.activePage?.label).toBe('Home');
    expect(model.activePage?.editHref).toBe('/?clastro-edit=1');
    expect(model.activePage?.fields.map((field) => field.id)).toEqual([
      'name',
      'metaTitle',
      'metaDescription',
      'schema',
    ]);
    expect(model.activePage?.fields.find((field) => field.id === 'name')?.value).toBe('Home');
    expect(model.activePage?.fields.find((field) => field.id === 'metaTitle')?.value).toBe(
      'Plastic Surgeon Tauranga | Procedures and Consultations',
    );
  });

  it('supports static pages for a different client contract', () => {
    const model = createCmsViewModel(
      plumberContract,
      plumberItems,
      { mode: 'pages', selectedPageId: 'home' },
      plumberPages,
    );

    expect(model.pageNavigation.map((page) => page.label)).toEqual(['Home', 'About', 'Services', 'Blog']);
    expect(model.pageNavigation.map((page) => page.path)).toEqual([
      '/joe-plumbing',
      '/joe-plumbing/about',
      '/joe-plumbing/services',
      '/joe-plumbing/blog',
    ]);
    expect(model.navigation.map((item) => item.label)).toEqual(['Services', 'Blog']);
    expect(model.activePage?.fields.map((field) => field.label)).toEqual(['Name', 'Meta Title', 'Meta Description', 'Schema']);
    expect(model.activePage?.fields.find((field) => field.id === 'metaDescription')?.value).toBe(
      'Emergency plumbing and planned repair services across Tauranga.',
    );
    expect(plumberPages.find((page) => page.pageId === 'home')?.values.serviceHeading).toBe('Services Joe keeps ready.');
    expect(model.activePage?.editHref).toBe('/joe-plumbing?clastro-edit=1');
  });

  it('creates a media mode with sample assets', () => {
    const model = createCmsViewModel(
      plumberContract,
      plumberItems,
      { mode: 'media' },
      plumberPages,
      plumberMediaAssets,
    );

    expect(model.activeMode).toBe('media');
    expect(model.mediaAssets).toEqual([
      expect.objectContaining({
        filename: 'joes-plumbing-van.webp',
        altText: "Joe's Plumbing van beside pipework",
      }),
    ]);
  });

  it('creates settings and users modes with visible signed-in access', () => {
    const settingsModel = createCmsViewModel(
      plumberContract,
      plumberItems,
      { mode: 'settings' },
      plumberPages,
      plumberMediaAssets,
      {
        siteSettings: demoSiteSettings,
        users: demoUsers,
        currentUserId: 'andrew-nalder',
      },
    );
    const usersModel = createCmsViewModel(
      plumberContract,
      plumberItems,
      { mode: 'users' },
      plumberPages,
      plumberMediaAssets,
      {
        siteSettings: demoSiteSettings,
        users: demoUsers,
        currentUserId: 'andrew-nalder',
      },
    );

    expect(settingsModel.activeMode).toBe('settings');
    expect(settingsModel.siteSettings?.siteName).toBe("Joe's Plumbing");
    expect(settingsModel.auth.currentUser?.roleLabel).toBe('Super admin');
    expect(usersModel.activeMode).toBe('users');
    expect(usersModel.auth.users.map((user) => user.accessLabel)).toContain('Visible support access');
    expect(usersModel.auth.canManageUsers).toBe(true);
  });

  it('resolves image fields to media previews', () => {
    const model = createCmsViewModel(
      plumberContract,
      plumberItems,
      { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
      plumberPages,
      plumberMediaAssets,
    );

    const heroImage = model.activeItem?.fields.find((field) => field.id === 'heroImage');

    expect(heroImage?.primitive).toBe('image');
    expect(heroImage?.mediaAsset).toEqual(expect.objectContaining({
      assetId: 'joes-plumbing-van',
      altText: "Joe's Plumbing van beside pipework",
    }));
  });

  it('resolves sortable gallery fields to ordered media previews', () => {
    const model = createCmsViewModel(
      plumberContract,
      plumberItems,
      { selectedCollectionId: 'services', selectedItemId: 'emergency' },
      plumberPages,
      plumberMediaAssets,
    );

    const gallery = model.activeItem?.fields.find((field) => field.id === 'gallery');

    expect(gallery?.primitive).toBe('sortableGallery');
    expect(gallery?.gallery?.heroAssetId).toBe('joes-plumbing-van');
    expect(gallery?.gallery?.assets).toEqual([
      expect.objectContaining({ assetId: 'joes-plumbing-van' }),
    ]);
  });

  it('uses draft item values when the selected item has been autosaved', () => {
    const draftItems = plumberItems.map((item) =>
      item.itemId === 'shutOffWater'
        ? {
            ...item,
            values: {
              ...item.values,
              title: 'Draft shut off water title',
            },
            status: 'draft' as const,
          }
        : item,
    );
    const model = createCmsViewModel(
      plumberContract,
      draftItems,
      { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
      plumberPages,
      plumberMediaAssets,
    );

    expect(model.activeItem?.fields.find((field) => field.id === 'title')?.value).toBe('Draft shut off water title');
  });

  it('shows AI integration and blog generation only for users with AI blog access', () => {
    const hiddenModel = createCmsViewModel(
      plumberContract,
      plumberItems,
      { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
      plumberPages,
      plumberMediaAssets,
      {
        siteSettings: demoSiteSettings,
        users: demoUsers.map((user) =>
          user.userId === 'joe-owner'
            ? {
                ...user,
                featureAccess: {
                  aiBlogGeneration: false,
                },
              }
            : user,
        ),
        currentUserId: 'joe-owner',
      },
    );
    const allowedModel = createCmsViewModel(
      plumberContract,
      plumberItems,
      { selectedCollectionId: 'blogPosts', selectedItemId: 'shutOffWater' },
      plumberPages,
      plumberMediaAssets,
      {
        siteSettings: demoSiteSettings,
        users: demoUsers,
        currentUserId: 'joe-owner',
      },
    );

    expect(hiddenModel.ai.visible).toBe(false);
    expect(hiddenModel.ai.canGenerateBlogPosts).toBe(false);
    expect(allowedModel.ai.visible).toBe(true);
    expect(allowedModel.ai.canGenerateBlogPosts).toBe(true);
    expect(allowedModel.ai.blogGenerationVisible).toBe(true);
  });
});
