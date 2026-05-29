import { describe, expect, it } from 'vitest';
import { plasticSurgeonContract, plumberContract } from '../../src/contracts';
import { plasticSurgeonItems, plasticSurgeonPages, plumberItems, plumberPages } from '../../src/cms/sample-content';
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

  it('creates a static page editor view from contract page regions', () => {
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
    expect(model.activePage?.fields.map((field) => field.id)).toEqual([
      'heroEyebrow',
      'heroHeading',
      'heroIntro',
      'heroCta',
    ]);
    expect(model.activePage?.fields.find((field) => field.id === 'heroCta')?.value).toBe('Book a consultation -> /contact');
  });

  it('supports static pages for a different client contract', () => {
    const model = createCmsViewModel(
      plumberContract,
      plumberItems,
      { mode: 'pages', selectedPageId: 'home' },
      plumberPages,
    );

    expect(model.activePage?.fields.map((field) => field.label)).toEqual([
      'Hero Heading',
      'Hero Intro',
      'Emergency CTA',
    ]);
    expect(model.activePage?.fields.find((field) => field.id === 'emergencyCta')?.value).toBe(
      'Call for urgent plumbing -> tel:+6475550184',
    );
  });
});
