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
});
