import { describe, expect, it } from 'vitest';
import { parseContentContract, plasticSurgeonContract, plumberContract } from '../../src/contracts';

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

describe('example contracts', () => {
  it('ships a plastic surgeon contract with procedure-specific extra sections', () => {
    const contract = parseContentContract(plasticSurgeonContract);
    const procedures = contract.collections.find((collection) => collection.id === 'procedures');

    expect(procedures?.extraSectionTypes.map((section) => section.id)).toContain('recoveryTimeline');
    expect(procedures?.extraSectionTypes.map((section) => section.id)).toContain('comparisonTable');
  });

  it("ships Joe's Plumbing with pages, services, and blog posts", () => {
    const contract = parseContentContract(plumberContract);
    const pagePaths = contract.pages.map((page) => page.path);
    const homePage = contract.pages.find((page) => page.id === 'home');
    const services = contract.collections.find((collection) => collection.id === 'services');
    const blogPosts = contract.collections.find((collection) => collection.id === 'blogPosts');

    expect(contract.siteId).toBe('joes-plumbing');
    expect(pagePaths).toEqual(['/joe-plumbing', '/joe-plumbing/about', '/joe-plumbing/services', '/joe-plumbing/blog']);
    expect(homePage?.regions.map((region) => region.id)).toEqual(
      expect.arrayContaining([
        'serviceHeading',
        'primaryCta',
        'heroAvailability',
        'statResponseValue',
        'statResponseLabel',
        'statJobsValue',
        'statJobsLabel',
        'statReviewsValue',
        'statReviewsLabel',
        'latestAdviceKicker',
        'blogCta',
      ]),
    );
    expect(services?.extraSectionTypes.map((section) => section.id)).toContain('serviceAreaList');
    expect(services?.extraSectionTypes.map((section) => section.id)).toContain('priceGuide');
    expect(services?.coreFields.map((field) => field.id)).toContain('gallery');
    expect(services?.coreFields.find((field) => field.id === 'gallery')?.primitive).toBe('sortableGallery');
    expect(blogPosts?.itemLabel).toBe('Blog Post');
    expect(blogPosts?.coreFields.find((field) => field.id === 'heroImage')?.primitive).toBe('image');
  });
});
