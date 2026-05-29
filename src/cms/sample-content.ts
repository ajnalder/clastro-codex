import type { ExtraSectionValue, JsonObject } from '../content-store/types';

export interface CmsSampleItem {
  collectionId: string;
  itemId: string;
  label: string;
  status: 'draft' | 'published';
  values: JsonObject;
  extraSections: ExtraSectionValue[];
}

export interface CmsSamplePage {
  pageId: string;
  label: string;
  status: 'draft' | 'published';
  values: JsonObject;
}

export const plasticSurgeonPages: CmsSamplePage[] = [
  {
    pageId: 'home',
    label: 'Home',
    status: 'published',
    values: {
      heroEyebrow: 'Plastic and reconstructive surgery',
      heroHeading: 'Clear, considered care for every stage',
      heroIntro: 'Consultation-led procedures with calm explanations, honest planning, and careful aftercare.',
      heroCta: {
        label: 'Book a consultation',
        href: '/contact',
      },
    },
  },
];

export const plasticSurgeonItems: CmsSampleItem[] = [
  {
    collectionId: 'procedures',
    itemId: 'aft',
    label: 'AFT Fat Transfer',
    status: 'draft',
    values: {
      title: 'AFT Fat Transfer',
      slug: 'aft-fat-transfer',
      summary: 'Breast volume using carefully processed autologous fat transfer.',
      heroImage: 'media/aft-hero.jpg',
      seo: 'AFT fat transfer breast enlargement in Tauranga',
    },
    extraSections: [
      {
        type: 'recoveryTimeline',
        values: {
          intro: 'A week-by-week recovery guide for patients comparing downtime expectations.',
          steps: 'Week 1: swelling and rest | Week 2: light activity | Week 6: review',
        },
      },
      {
        type: 'comparisonTable',
        values: {
          table: 'AFT vs implants: incision, recovery, volume change, scarring',
        },
      },
    ],
  },
  {
    collectionId: 'procedures',
    itemId: 'breastReduction',
    label: 'Breast Reduction',
    status: 'published',
    values: {
      title: 'Breast Reduction',
      slug: 'breast-reduction',
      summary: 'A procedure for reducing breast size and improving physical comfort.',
      heroImage: 'media/breast-reduction-hero.jpg',
      seo: 'Breast reduction surgery information',
    },
    extraSections: [
      {
        type: 'faqCluster',
        values: {
          faqs: 'How long is recovery? | Will scarring fade? | When can I return to work?',
        },
      },
    ],
  },
  {
    collectionId: 'blogPosts',
    itemId: 'recoveryGuide',
    label: 'Planning Your Recovery Window',
    status: 'draft',
    values: {
      title: 'Planning Your Recovery Window',
      slug: 'planning-your-recovery-window',
      body: 'A practical guide to preparing home, work, and support around a procedure.',
      seo: 'Recovery planning guide for cosmetic surgery',
    },
    extraSections: [],
  },
];

export const plumberItems: CmsSampleItem[] = [
  {
    collectionId: 'services',
    itemId: 'emergency',
    label: 'Emergency Plumbing',
    status: 'draft',
    values: {
      title: 'Emergency Plumbing',
      slug: 'emergency-plumbing',
      summary: 'Fast help for leaks, burst pipes, blocked drains, and urgent plumbing faults.',
      heroImage: 'media/emergency-plumbing.jpg',
      seo: 'Emergency plumber available today',
    },
    extraSections: [
      {
        type: 'serviceAreaList',
        values: {
          areas: 'Mount Maunganui, Papamoa, Tauranga South, Bethlehem',
        },
      },
      {
        type: 'priceGuide',
        values: {
          prices: 'Callout: from $145 | After-hours: quoted before dispatch',
        },
      },
      {
        type: 'urgencyCallout',
        values: {
          copy: 'If water is actively escaping, turn off the mains before calling.',
        },
      },
    ],
  },
];

export const plumberPages: CmsSamplePage[] = [
  {
    pageId: 'home',
    label: 'Home',
    status: 'draft',
    values: {
      heroHeading: 'Plumbing help that arrives prepared',
      heroIntro: 'Urgent repairs, planned upgrades, and clear pricing for homes across Tauranga.',
      emergencyCta: {
        label: 'Call for urgent plumbing',
        href: 'tel:+6475550184',
      },
    },
  },
];
