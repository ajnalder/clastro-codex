import { describe, expect, it } from 'vitest';
import { plasticSurgeonContract, plumberContract } from '../../src/contracts';
import { plasticSurgeonItems, plumberItems } from '../../src/cms/sample-content';
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
});
