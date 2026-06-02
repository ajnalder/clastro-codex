import type { ExtraSectionValue, JsonObject } from '../content-store/types';
import type { MediaAsset } from '../media/types';

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
      name: 'Home',
      metaTitle: 'Plastic Surgeon Tauranga | Procedures and Consultations',
      metaDescription: 'Plastic and reconstructive surgery consultations with clear planning and careful aftercare.',
      schema: '{"@context":"https://schema.org","@type":"MedicalBusiness","name":"Clastro Plastic Surgery Demo"}',
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
    status: 'published',
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
  {
    collectionId: 'services',
    itemId: 'hotWater',
    label: 'Hot Water Repairs',
    status: 'published',
    values: {
      title: 'Hot Water Repairs',
      slug: 'hot-water-repairs',
      summary: 'Repair, replacement, and maintenance for cylinders, valves, and tempering faults.',
      heroImage: 'media/hot-water-repairs.jpg',
      seo: 'Hot water cylinder repair and replacement in Tauranga',
    },
    extraSections: [
      {
        type: 'priceGuide',
        values: {
          prices: 'Valve replacement: from $220 | Cylinder assessment: from $165 | Replacement: quoted after inspection',
        },
      },
    ],
  },
  {
    collectionId: 'services',
    itemId: 'blockedDrains',
    label: 'Blocked Drains',
    status: 'draft',
    values: {
      title: 'Blocked Drains',
      slug: 'blocked-drains',
      summary: 'Drain clearing for kitchens, bathrooms, gullies, and stormwater lines.',
      heroImage: 'media/blocked-drains.jpg',
      seo: 'Blocked drain plumber in Tauranga',
    },
    extraSections: [
      {
        type: 'urgencyCallout',
        values: {
          copy: 'If water is backing up inside, stop using nearby fixtures until the line is cleared.',
        },
      },
    ],
  },
  {
    collectionId: 'blogPosts',
    itemId: 'shutOffWater',
    label: 'How to Shut Off Water in a Hurry',
    status: 'published',
    values: {
      title: 'How to Shut Off Water in a Hurry',
      slug: 'how-to-shut-off-water',
      excerpt: 'A quick homeowner guide for finding the toby, isolating fixtures, and reducing water damage.',
      body: 'Knowing where to shut off water can turn a stressful leak into a manageable repair call.',
      heroImage: 'media/shut-off-water.jpg',
      publishDate: '2026-05-15',
      seo: 'How to shut off water during a plumbing emergency',
    },
    extraSections: [],
  },
  {
    collectionId: 'blogPosts',
    itemId: 'hotWaterWarningSigns',
    label: 'Five Signs Your Hot Water Cylinder Needs Attention',
    status: 'draft',
    values: {
      title: 'Five Signs Your Hot Water Cylinder Needs Attention',
      slug: 'hot-water-cylinder-warning-signs',
      excerpt: 'Noisy valves, rusty water, pressure changes, and recovery time can all point to a repair.',
      body: 'Small changes in hot water performance often show up before a cylinder fails completely.',
      heroImage: 'media/hot-water-warning-signs.jpg',
      publishDate: '2026-05-22',
      seo: 'Hot water cylinder warning signs',
    },
    extraSections: [],
  },
];

export const plumberPages: CmsSamplePage[] = [
  {
    pageId: 'home',
    label: 'Home',
    status: 'published',
    values: {
      name: 'Home',
      metaTitle: "Joe's Plumbing Tauranga | Fast, Tidy Repairs",
      metaDescription: 'Emergency plumbing and planned repair services across Tauranga.',
      schema: '{"@context":"https://schema.org","@type":"Plumber","name":"Joe\'s Plumbing","areaServed":"Tauranga"}',
      heroEyebrow: 'Tauranga plumbing repairs',
      heroHeading: 'Plumbing help that arrives prepared.',
      heroIntro: 'Joe’s Plumbing handles urgent repairs, careful upgrades, and practical maintenance without making a mess of your day.',
      primaryCta: {
        label: 'Book a plumber',
        href: '/joe-plumbing/services',
      },
      heroAvailability: 'Same-day emergency slots',
      statResponseValue: '47 min',
      statResponseLabel: 'median response',
      statJobsValue: '312',
      statJobsLabel: 'jobs this year',
      statReviewsValue: '4.8',
      statReviewsLabel: 'review average',
      serviceHeading: 'Services Joe keeps ready.',
      serviceIntro: 'From burst pipes to tired hot water systems, the team keeps the work clear, tidy, and easy to understand.',
      latestAdviceKicker: 'Latest advice',
      blogCta: {
        label: 'Read the blog',
        href: '/joe-plumbing/blog',
      },
    },
  },
  {
    pageId: 'about',
    label: 'About',
    status: 'published',
    values: {
      name: 'About',
      metaTitle: "About Joe's Plumbing | Local Tauranga Plumbers",
      metaDescription: "Meet Joe's Plumbing, a practical Tauranga team focused on tidy repairs and honest advice.",
      schema: '{"@context":"https://schema.org","@type":"AboutPage","name":"About Joe\'s Plumbing"}',
      pageHeading: 'Plumbers who explain the job before they start.',
      intro: 'Joe started the business after seeing how often customers were left guessing about cost, timing, and what actually went wrong.',
      proofPoint: 'Every visit ends with a simple explanation of what was fixed and what to keep an eye on next.',
    },
  },
  {
    pageId: 'servicesPage',
    label: 'Services',
    status: 'published',
    values: {
      name: 'Services',
      metaTitle: "Plumbing Services Tauranga | Joe's Plumbing",
      metaDescription: 'Emergency plumbing, hot water repairs, blocked drains, and maintenance services across Tauranga.',
      schema: '{"@context":"https://schema.org","@type":"Service","provider":{"@type":"Plumber","name":"Joe\'s Plumbing"}}',
      pageHeading: 'Plumbing services for urgent problems and planned fixes.',
      intro: 'The service list is structured in the CMS, so Joe can update service names, summaries, pricing notes, and area details without touching the page layout.',
      emergencyCta: {
        label: 'Call Joe now',
        href: 'tel:+6475550184',
      },
    },
  },
  {
    pageId: 'blogPage',
    label: 'Blog',
    status: 'draft',
    values: {
      name: 'Blog',
      metaTitle: "Plumbing Advice | Joe's Plumbing Blog",
      metaDescription: 'Simple plumbing advice for Tauranga homeowners, written by Joe’s Plumbing.',
      schema: '{"@context":"https://schema.org","@type":"Blog","name":"Joe\'s Plumbing Blog"}',
      pageHeading: 'Straightforward plumbing advice.',
      intro: 'Short articles for homeowners who want to make the right call before a small plumbing issue turns expensive.',
    },
  },
];

export const plumberMediaAssets: MediaAsset[] = [
  {
    siteId: 'joes-plumbing',
    assetId: 'joes-plumbing-van',
    filename: 'joes-plumbing-van.webp',
    altText: "Joe's Plumbing van beside pipework",
    caption: 'Illustrated service van used on the homepage hero.',
    contentType: 'image/webp',
    width: 900,
    height: 620,
    variants: {
      thumb: {
        r2Key: 'sites/joes-plumbing/media/joes-plumbing-van/thumb.webp',
        url: '/joe-plumbing/van.svg',
        width: 360,
        height: 248,
        bytes: 18420,
        contentType: 'image/webp',
      },
      card: {
        r2Key: 'sites/joes-plumbing/media/joes-plumbing-van/card.webp',
        url: '/joe-plumbing/van.svg',
        width: 900,
        height: 620,
        bytes: 46200,
        contentType: 'image/webp',
      },
      large: {
        r2Key: 'sites/joes-plumbing/media/joes-plumbing-van/large.webp',
        url: '/joe-plumbing/van.svg',
        width: 900,
        height: 620,
        bytes: 46200,
        contentType: 'image/webp',
      },
    },
    createdAt: '2026-06-02T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
  },
];
