import type { ContentContract } from '../content-contract';

export const plumberContract: ContentContract = {
  siteId: 'plumber-demo',
  version: 1,
  collections: [
    {
      id: 'services',
      label: 'Services',
      itemLabel: 'Service',
      coreFields: [
        { id: 'title', label: 'Title', primitive: 'shortText', required: true },
        { id: 'slug', label: 'Slug', primitive: 'shortText', required: true },
        { id: 'summary', label: 'Summary', primitive: 'richText', required: true },
        { id: 'heroImage', label: 'Hero Image', primitive: 'image', required: false },
        { id: 'seo', label: 'SEO Metadata', primitive: 'seoMetadata', required: true },
      ],
      extraSectionTypes: [
        {
          id: 'serviceAreaList',
          label: 'Service Area List',
          fields: [
            { id: 'areas', label: 'Areas', primitive: 'categorySelect', required: true },
          ],
        },
        {
          id: 'priceGuide',
          label: 'Price Guide',
          fields: [
            { id: 'prices', label: 'Prices', primitive: 'table', required: true },
          ],
        },
        {
          id: 'urgencyCallout',
          label: 'Urgency Callout',
          fields: [
            { id: 'copy', label: 'Copy', primitive: 'callout', required: true },
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
        { id: 'heroIntro', label: 'Hero Intro', primitive: 'richText', required: true },
        { id: 'emergencyCta', label: 'Emergency CTA', primitive: 'buttonLink', required: true },
      ],
    },
  ],
};
