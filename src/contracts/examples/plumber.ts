import type { ContentContract } from '../content-contract';

export const plumberContract: ContentContract = {
  siteId: 'joes-plumbing',
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
    {
      id: 'blogPosts',
      label: 'Blog',
      itemLabel: 'Blog Post',
      coreFields: [
        { id: 'title', label: 'Title', primitive: 'shortText', required: true },
        { id: 'slug', label: 'Slug', primitive: 'shortText', required: true },
        { id: 'excerpt', label: 'Excerpt', primitive: 'longText', required: true },
        { id: 'body', label: 'Body', primitive: 'richText', required: true },
        { id: 'heroImage', label: 'Hero Image', primitive: 'image', required: false },
        { id: 'publishDate', label: 'Publish Date', primitive: 'date', required: true },
        { id: 'seo', label: 'SEO Metadata', primitive: 'seoMetadata', required: true },
      ],
      extraSectionTypes: [],
    },
  ],
  pages: [
    {
      id: 'home',
      path: '/joe-plumbing',
      label: 'Home',
      regions: [
        { id: 'heroEyebrow', label: 'Hero Eyebrow', primitive: 'shortText', required: false },
        { id: 'heroHeading', label: 'Hero Heading', primitive: 'shortText', required: true },
        { id: 'heroIntro', label: 'Hero Intro', primitive: 'richText', required: true },
        { id: 'primaryCta', label: 'Primary CTA', primitive: 'buttonLink', required: true },
        { id: 'heroAvailability', label: 'Hero Availability Tag', primitive: 'shortText', required: false },
        { id: 'statResponseValue', label: 'Response Stat Value', primitive: 'shortText', required: true },
        { id: 'statResponseLabel', label: 'Response Stat Label', primitive: 'shortText', required: true },
        { id: 'statJobsValue', label: 'Jobs Stat Value', primitive: 'shortText', required: true },
        { id: 'statJobsLabel', label: 'Jobs Stat Label', primitive: 'shortText', required: true },
        { id: 'statReviewsValue', label: 'Reviews Stat Value', primitive: 'shortText', required: true },
        { id: 'statReviewsLabel', label: 'Reviews Stat Label', primitive: 'shortText', required: true },
        { id: 'serviceHeading', label: 'Service Heading', primitive: 'shortText', required: true },
        { id: 'serviceIntro', label: 'Service Intro', primitive: 'richText', required: true },
        { id: 'latestAdviceKicker', label: 'Latest Advice Kicker', primitive: 'shortText', required: false },
        { id: 'blogCta', label: 'Blog CTA', primitive: 'buttonLink', required: true },
      ],
    },
    {
      id: 'about',
      path: '/joe-plumbing/about',
      label: 'About',
      regions: [
        { id: 'pageHeading', label: 'Page Heading', primitive: 'shortText', required: true },
        { id: 'intro', label: 'Intro', primitive: 'richText', required: true },
        { id: 'proofPoint', label: 'Proof Point', primitive: 'callout', required: true },
      ],
    },
    {
      id: 'servicesPage',
      path: '/joe-plumbing/services',
      label: 'Services',
      regions: [
        { id: 'pageHeading', label: 'Page Heading', primitive: 'shortText', required: true },
        { id: 'intro', label: 'Intro', primitive: 'richText', required: true },
        { id: 'emergencyCta', label: 'Emergency CTA', primitive: 'buttonLink', required: true },
      ],
    },
    {
      id: 'blogPage',
      path: '/joe-plumbing/blog',
      label: 'Blog',
      regions: [
        { id: 'pageHeading', label: 'Page Heading', primitive: 'shortText', required: true },
        { id: 'intro', label: 'Intro', primitive: 'richText', required: true },
      ],
    },
  ],
};
