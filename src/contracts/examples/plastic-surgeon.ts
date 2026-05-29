import type { ContentContract } from '../content-contract';

export const plasticSurgeonContract: ContentContract = {
  siteId: 'plastic-surgeon-demo',
  version: 1,
  collections: [
    {
      id: 'procedures',
      label: 'Procedures',
      itemLabel: 'Procedure',
      coreFields: [
        { id: 'title', label: 'Title', primitive: 'shortText', required: true },
        { id: 'slug', label: 'Slug', primitive: 'shortText', required: true },
        { id: 'summary', label: 'Summary', primitive: 'richText', required: true },
        { id: 'heroImage', label: 'Hero Image', primitive: 'image', required: true },
        { id: 'seo', label: 'SEO Metadata', primitive: 'seoMetadata', required: true },
      ],
      extraSectionTypes: [
        {
          id: 'recoveryTimeline',
          label: 'Recovery Timeline',
          fields: [
            { id: 'intro', label: 'Intro', primitive: 'richText', required: true },
            { id: 'steps', label: 'Timeline Steps', primitive: 'table', required: true },
          ],
        },
        {
          id: 'comparisonTable',
          label: 'Comparison Table',
          fields: [
            { id: 'table', label: 'Table', primitive: 'table', required: true },
          ],
        },
        {
          id: 'faqCluster',
          label: 'FAQ Cluster',
          fields: [
            { id: 'faqs', label: 'FAQs', primitive: 'faqList', required: true },
          ],
        },
      ],
    },
    {
      id: 'blogPosts',
      label: 'Blog',
      itemLabel: 'Blog Post',
      coreFields: [
        { id: 'title', label: 'Title', primitive: 'shortText', required: true },
        { id: 'slug', label: 'Slug', primitive: 'shortText', required: true },
        { id: 'body', label: 'Body', primitive: 'richText', required: true },
        { id: 'seo', label: 'SEO Metadata', primitive: 'seoMetadata', required: true },
      ],
      extraSectionTypes: [],
    },
  ],
  pages: [
    {
      id: 'home',
      path: '/',
      label: 'Home',
      regions: [
        { id: 'heroEyebrow', label: 'Hero Eyebrow', primitive: 'shortText', required: false },
        { id: 'heroHeading', label: 'Hero Heading', primitive: 'shortText', required: true },
        { id: 'heroIntro', label: 'Hero Intro', primitive: 'richText', required: true },
        { id: 'heroCta', label: 'Hero CTA', primitive: 'buttonLink', required: true },
      ],
    },
  ],
};
