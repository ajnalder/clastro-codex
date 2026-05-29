import { describe, expect, it } from 'vitest';
import { parseContentContract } from '../../src/contracts';

describe('parseContentContract', () => {
  it('accepts collections with core fields and per-item extra section definitions', () => {
    const contract = parseContentContract({
      siteId: 'demo-site',
      version: 1,
      collections: [
        {
          id: 'procedures',
          label: 'Procedures',
          itemLabel: 'Procedure',
          coreFields: [
            { id: 'title', label: 'Title', primitive: 'shortText', required: true },
            { id: 'summary', label: 'Summary', primitive: 'richText', required: true },
          ],
          extraSectionTypes: [
            {
              id: 'recoveryTimeline',
              label: 'Recovery Timeline',
              fields: [
                { id: 'intro', label: 'Intro', primitive: 'richText', required: true },
              ],
            },
          ],
        },
      ],
      pages: [
        {
          id: 'home',
          path: '/',
          label: 'Home',
          regions: [
            { id: 'heroHeading', label: 'Hero Heading', primitive: 'shortText', required: true },
          ],
        },
      ],
    });

    expect(contract.collections[0].extraSectionTypes[0].id).toBe('recoveryTimeline');
    expect(contract.pages[0].regions[0].id).toBe('heroHeading');
  });

  it('rejects duplicate field ids inside a collection core schema', () => {
    expect(() =>
      parseContentContract({
        siteId: 'demo-site',
        version: 1,
        collections: [
          {
            id: 'products',
            label: 'Products',
            itemLabel: 'Product',
            coreFields: [
              { id: 'title', label: 'Title', primitive: 'shortText', required: true },
              { id: 'title', label: 'Duplicate Title', primitive: 'shortText', required: false },
            ],
            extraSectionTypes: [],
          },
        ],
        pages: [],
      }),
    ).toThrow('Duplicate field id "title" in collection "products"');
  });
});
