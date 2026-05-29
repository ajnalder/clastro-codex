# Clastro Codex Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working foundation for Clastro Codex: an Astro + Cloudflare Workers project with a tested content contract engine, D1 schema, seed data, and a basic private CMS API.

**Architecture:** This first slice creates the reusable framework core rather than the full CMS UI. The public Astro app remains static-friendly, while a Worker API owns content contract validation, draft/published content storage, and build-snapshot export. Later plans will add inline WYSIWYG editing, media library UI, publishing orchestration, analytics, and AI blog tooling on top of this foundation.

**Tech Stack:** Astro, TypeScript, Cloudflare Workers, D1, R2 bindings, Vitest, Zod, Wrangler, npm.

---

## Scope Check

The approved design spec covers several independent subsystems: content contracts, inline editing, collection editing, media library, draft/publish, Astro rebuilds, analytics, and AI blog assistance. This plan intentionally implements only the foundation slice:

- project scaffold
- content contract types and validation
- reusable primitives
- per-item extra section modelling
- D1 schema and seed data
- Worker API for contracts, items, drafts, publish snapshots
- Astro shell pages that can read a published snapshot during build/runtime development
- tests for the core behaviours

The following spec areas require later plans:

- inline WYSIWYG static page editing
- CMS admin interface
- media library UI and R2 upload flow
- authenticated owner/editor sessions
- publish-triggered deployment/rebuild pipeline
- GA4/Search Console analytics
- OpenAI/DataForSEO blog assistance

## File Structure

- Create: `package.json` - scripts and dependencies for Astro, Worker, tests, and Wrangler.
- Create: `tsconfig.json` - shared TypeScript settings.
- Create: `.gitignore` - avoids committing dependencies, builds, local env files, and Cloudflare state.
- Create: `.env.example` - documents local configuration names.
- Create: `astro.config.mjs` - Astro configuration.
- Create: `wrangler.jsonc` - Worker, assets, D1, and R2 binding configuration.
- Create: `src/contracts/primitives.ts` - primitive schemas shared by pages, collections, and per-item extras.
- Create: `src/contracts/content-contract.ts` - content contract schema and parser.
- Create: `src/contracts/examples/plastic-surgeon.ts` - example contract demonstrating procedures and per-item extras.
- Create: `src/contracts/examples/plumber.ts` - example contract demonstrating services and trade-specific extras.
- Create: `src/contracts/index.ts` - public exports for contract modules.
- Create: `src/content-store/types.ts` - content item, draft, published snapshot, and repository types.
- Create: `src/content-store/memory-store.ts` - test-friendly in-memory store implementing repository behaviour.
- Create: `src/content-store/d1-store.ts` - D1 repository implementation.
- Create: `src/content-store/snapshot.ts` - build-snapshot generator.
- Create: `src/worker/env.ts` - Worker environment bindings.
- Create: `src/worker/response.ts` - JSON response helpers.
- Create: `src/worker/routes.ts` - Worker API routing.
- Create: `src/worker/index.ts` - Worker entrypoint.
- Create: `src/pages/index.astro` - simple public shell proving Astro renders.
- Create: `src/pages/api-snapshot.json.ts` - local Astro endpoint for inspecting snapshot data during development.
- Create: `db/migrations/0001_initial.sql` - D1 schema for contracts, items, drafts, published snapshots, and media metadata.
- Create: `scripts/seed-example-contract.mjs` - local seed script for example contracts.
- Create: `tests/contracts/content-contract.test.ts` - contract validation tests.
- Create: `tests/content-store/memory-store.test.ts` - draft and publish behaviour tests.
- Create: `tests/content-store/snapshot.test.ts` - snapshot generation tests.
- Create: `tests/worker/routes.test.ts` - Worker API behaviour tests.
- Create: `vitest.config.ts` - Vitest configuration.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `astro.config.mjs`
- Create: `wrangler.jsonc`
- Create: `src/pages/index.astro`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create package manifest**

Create `package.json`:

```json
{
  "name": "clastro-codex",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "worker:dev": "wrangler dev src/worker/index.ts",
    "db:migrate:local": "wrangler d1 migrations apply CLASTRO_DB --local",
    "db:migrate:remote": "wrangler d1 migrations apply CLASTRO_DB --remote",
    "seed:examples": "node scripts/seed-example-contract.mjs"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^12.6.0",
    "astro": "^5.8.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250525.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0",
    "wrangler": "^4.17.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 3: Create TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "types": ["@cloudflare/workers-types", "vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "tests", "astro.config.mjs", "vitest.config.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Create ignore file**

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.wrangler/
.dev.vars
.env
.env.*
!.env.example
coverage/
```

- [ ] **Step 5: Create environment example**

Create `.env.example`:

```bash
# Clastro Codex local development
CLASTRO_SITE_ID=demo-site
OPENAI_API_KEY=
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```

- [ ] **Step 6: Create Astro config**

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
});
```

- [ ] **Step 7: Create Wrangler config**

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "clastro-codex",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-05-29",
  "assets": {
    "directory": "./dist"
  },
  "d1_databases": [
    {
      "binding": "CLASTRO_DB",
      "database_name": "clastro-codex",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ],
  "r2_buckets": [
    {
      "binding": "CLASTRO_MEDIA",
      "bucket_name": "clastro-codex-media"
    }
  ]
}
```

This UUID is a local-development value. Before the first remote deployment, run `npx wrangler d1 create clastro-codex` and replace it with the database id returned by Wrangler.

- [ ] **Step 8: Create Astro home page**

Create `src/pages/index.astro`:

```astro
---
const title = 'Clastro Codex';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <h1>{title}</h1>
      <p>Framework-first CMS foundation for static Astro sites.</p>
    </main>
  </body>
</html>
```

- [ ] **Step 9: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 10: Verify scaffold builds**

Run:

```bash
npm run build
npm test
```

Expected: Astro build succeeds. Vitest exits successfully with "No test files found" only before test files are added, or all tests pass once later tasks exist.

- [ ] **Step 11: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json .gitignore .env.example astro.config.mjs wrangler.jsonc src/pages/index.astro vitest.config.ts
git commit -m "chore: scaffold clastro codex"
```

Expected: commit succeeds.

## Task 2: Content Contract Schema

**Files:**
- Create: `src/contracts/primitives.ts`
- Create: `src/contracts/content-contract.ts`
- Create: `src/contracts/index.ts`
- Test: `tests/contracts/content-contract.test.ts`

- [ ] **Step 1: Write failing contract tests**

Create `tests/contracts/content-contract.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: FAIL because `src/contracts` does not exist.

- [ ] **Step 3: Implement primitive schema**

Create `src/contracts/primitives.ts`:

```ts
import { z } from 'zod';

export const PrimitiveIdSchema = z.enum([
  'shortText',
  'longText',
  'richText',
  'image',
  'mediaFile',
  'imageGallery',
  'sortableGallery',
  'buttonLink',
  'internalReference',
  'table',
  'faqList',
  'callout',
  'quote',
  'number',
  'currency',
  'date',
  'categorySelect',
  'relatedItemPicker',
  'seoMetadata',
]);

export type PrimitiveId = z.infer<typeof PrimitiveIdSchema>;

export const FieldSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  primitive: PrimitiveIdSchema,
  required: z.boolean().default(false),
});

export type FieldDefinition = z.infer<typeof FieldSchema>;
```

- [ ] **Step 4: Implement content contract schema**

Create `src/contracts/content-contract.ts`:

```ts
import { z } from 'zod';
import { FieldSchema } from './primitives';

const ExtraSectionTypeSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  fields: z.array(FieldSchema).min(1),
});

const CollectionSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  itemLabel: z.string().min(1),
  coreFields: z.array(FieldSchema).min(1),
  extraSectionTypes: z.array(ExtraSectionTypeSchema).default([]),
});

const PageRegionSchema = FieldSchema;

const PageSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  path: z.string().min(1),
  label: z.string().min(1),
  regions: z.array(PageRegionSchema).default([]),
});

export const ContentContractSchema = z.object({
  siteId: z.string().min(1),
  version: z.number().int().positive(),
  collections: z.array(CollectionSchema).default([]),
  pages: z.array(PageSchema).default([]),
});

export type ContentContract = z.infer<typeof ContentContractSchema>;

function assertUniqueIds(items: Array<{ id: string }>, context: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate field id "${item.id}" in ${context}`);
    }
    seen.add(item.id);
  }
}

export function parseContentContract(input: unknown): ContentContract {
  const contract = ContentContractSchema.parse(input);

  for (const collection of contract.collections) {
    assertUniqueIds(collection.coreFields, `collection "${collection.id}"`);
    assertUniqueIds(collection.extraSectionTypes, `extra sections for collection "${collection.id}"`);
    for (const section of collection.extraSectionTypes) {
      assertUniqueIds(section.fields, `extra section "${section.id}" in collection "${collection.id}"`);
    }
  }

  for (const page of contract.pages) {
    assertUniqueIds(page.regions, `page "${page.id}"`);
  }

  return contract;
}
```

- [ ] **Step 5: Export contract modules**

Create `src/contracts/index.ts`:

```ts
export * from './content-contract';
export * from './primitives';
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit contract schema**

Run:

```bash
git add src/contracts tests/contracts/content-contract.test.ts
git commit -m "feat: add content contract schema"
```

Expected: commit succeeds.

## Task 3: Example Contracts

**Files:**
- Create: `src/contracts/examples/plastic-surgeon.ts`
- Create: `src/contracts/examples/plumber.ts`
- Modify: `src/contracts/index.ts`
- Test: `tests/contracts/content-contract.test.ts`

- [ ] **Step 1: Extend tests for examples**

Append to `tests/contracts/content-contract.test.ts`:

```ts
import { plasticSurgeonContract, plumberContract } from '../../src/contracts';

describe('example contracts', () => {
  it('ships a plastic surgeon contract with procedure-specific extra sections', () => {
    const contract = parseContentContract(plasticSurgeonContract);
    const procedures = contract.collections.find((collection) => collection.id === 'procedures');

    expect(procedures?.extraSectionTypes.map((section) => section.id)).toContain('recoveryTimeline');
    expect(procedures?.extraSectionTypes.map((section) => section.id)).toContain('comparisonTable');
  });

  it('ships a plumber contract with service-specific extra sections', () => {
    const contract = parseContentContract(plumberContract);
    const services = contract.collections.find((collection) => collection.id === 'services');

    expect(services?.extraSectionTypes.map((section) => section.id)).toContain('serviceAreaList');
    expect(services?.extraSectionTypes.map((section) => section.id)).toContain('priceGuide');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: FAIL because the example contracts are not exported.

- [ ] **Step 3: Create plastic surgeon example contract**

Create `src/contracts/examples/plastic-surgeon.ts`:

```ts
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
```

- [ ] **Step 4: Create plumber example contract**

Create `src/contracts/examples/plumber.ts`:

```ts
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
```

- [ ] **Step 5: Export example contracts**

Modify `src/contracts/index.ts`:

```ts
export * from './content-contract';
export * from './primitives';
export * from './examples/plastic-surgeon';
export * from './examples/plumber';
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm test -- tests/contracts/content-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit example contracts**

Run:

```bash
git add src/contracts tests/contracts/content-contract.test.ts
git commit -m "feat: add example content contracts"
```

Expected: commit succeeds.

## Task 4: Content Store Core

**Files:**
- Create: `src/content-store/types.ts`
- Create: `src/content-store/memory-store.ts`
- Test: `tests/content-store/memory-store.test.ts`

- [ ] **Step 1: Write failing memory store tests**

Create `tests/content-store/memory-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';

describe('MemoryContentStore', () => {
  it('autosaves a draft without changing the published item', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'Draft title' },
      extraSections: [],
      updatedBy: 'owner',
    });

    expect(await store.getPublishedItem('demo-site', 'procedures', 'aft')).toBeNull();
    expect(await store.getDraftItem('demo-site', 'procedures', 'aft')).toMatchObject({
      values: { title: 'Draft title' },
      status: 'draft',
    });
  });

  it('publishes the current draft as the source item', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'Draft title' },
      extraSections: [{ type: 'recoveryTimeline', values: { intro: 'Week by week' } }],
      updatedBy: 'owner',
    });

    const published = await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');

    expect(published.status).toBe('published');
    expect(published.extraSections[0].type).toBe('recoveryTimeline');
    expect(await store.getPublishedItem('demo-site', 'procedures', 'aft')).toMatchObject({
      values: { title: 'Draft title' },
      status: 'published',
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/content-store/memory-store.test.ts
```

Expected: FAIL because `MemoryContentStore` does not exist.

- [ ] **Step 3: Define content store types**

Create `src/content-store/types.ts`:

```ts
export type ContentStatus = 'draft' | 'published';

export type JsonObject = Record<string, unknown>;

export interface ExtraSectionValue {
  type: string;
  values: JsonObject;
}

export interface ContentItem {
  siteId: string;
  collectionId: string;
  itemId: string;
  values: JsonObject;
  extraSections: ExtraSectionValue[];
  status: ContentStatus;
  updatedBy: string;
  updatedAt: string;
}

export interface SaveDraftInput {
  siteId: string;
  collectionId: string;
  itemId: string;
  values: JsonObject;
  extraSections: ExtraSectionValue[];
  updatedBy: string;
}

export interface ContentStore {
  saveDraft(input: SaveDraftInput): Promise<ContentItem>;
  getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null>;
  getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null>;
  publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem>;
  listPublishedItems(siteId: string): Promise<ContentItem[]>;
}
```

- [ ] **Step 4: Implement memory store**

Create `src/content-store/memory-store.ts`:

```ts
import type { ContentItem, ContentStore, SaveDraftInput } from './types';

function itemKey(siteId: string, collectionId: string, itemId: string): string {
  return `${siteId}:${collectionId}:${itemId}`;
}

function cloneItem(item: ContentItem): ContentItem {
  return structuredClone(item);
}

export class MemoryContentStore implements ContentStore {
  private drafts = new Map<string, ContentItem>();
  private published = new Map<string, ContentItem>();

  async saveDraft(input: SaveDraftInput): Promise<ContentItem> {
    const item: ContentItem = {
      ...input,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    this.drafts.set(itemKey(input.siteId, input.collectionId, input.itemId), cloneItem(item));
    return cloneItem(item);
  }

  async getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    const item = this.drafts.get(itemKey(siteId, collectionId, itemId));
    return item ? cloneItem(item) : null;
  }

  async getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    const item = this.published.get(itemKey(siteId, collectionId, itemId));
    return item ? cloneItem(item) : null;
  }

  async publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem> {
    const draft = await this.getDraftItem(siteId, collectionId, itemId);
    if (!draft) {
      throw new Error(`Draft not found for ${siteId}/${collectionId}/${itemId}`);
    }

    const published: ContentItem = {
      ...draft,
      status: 'published',
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.published.set(itemKey(siteId, collectionId, itemId), cloneItem(published));
    return cloneItem(published);
  }

  async listPublishedItems(siteId: string): Promise<ContentItem[]> {
    return [...this.published.values()]
      .filter((item) => item.siteId === siteId)
      .map(cloneItem);
  }
}
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm test -- tests/content-store/memory-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit content store core**

Run:

```bash
git add src/content-store tests/content-store/memory-store.test.ts
git commit -m "feat: add draftable content store"
```

Expected: commit succeeds.

## Task 5: Published Snapshot Generation

**Files:**
- Create: `src/content-store/snapshot.ts`
- Test: `tests/content-store/snapshot.test.ts`

- [ ] **Step 1: Write failing snapshot tests**

Create `tests/content-store/snapshot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';
import { createPublishedSnapshot } from '../../src/content-store/snapshot';

describe('createPublishedSnapshot', () => {
  it('exports only published items for the requested site', async () => {
    const store = new MemoryContentStore();

    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'AFT Fat Transfer' },
      extraSections: [],
      updatedBy: 'owner',
    });
    await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');
    await store.saveDraft({
      siteId: 'other-site',
      collectionId: 'procedures',
      itemId: 'other',
      values: { title: 'Other' },
      extraSections: [],
      updatedBy: 'owner',
    });
    await store.publishDraft('other-site', 'procedures', 'other', 'owner');

    const snapshot = await createPublishedSnapshot(store, 'demo-site');

    expect(snapshot.siteId).toBe('demo-site');
    expect(snapshot.collections.procedures.aft.values.title).toBe('AFT Fat Transfer');
    expect(snapshot.collections.procedures.other).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/content-store/snapshot.test.ts
```

Expected: FAIL because `createPublishedSnapshot` does not exist.

- [ ] **Step 3: Implement snapshot generation**

Create `src/content-store/snapshot.ts`:

```ts
import type { ContentItem, ContentStore } from './types';

export interface PublishedSnapshot {
  siteId: string;
  generatedAt: string;
  collections: Record<string, Record<string, ContentItem>>;
}

export async function createPublishedSnapshot(store: ContentStore, siteId: string): Promise<PublishedSnapshot> {
  const items = await store.listPublishedItems(siteId);
  const collections: PublishedSnapshot['collections'] = {};

  for (const item of items) {
    collections[item.collectionId] ??= {};
    collections[item.collectionId][item.itemId] = item;
  }

  return {
    siteId,
    generatedAt: new Date().toISOString(),
    collections,
  };
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- tests/content-store/snapshot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit snapshot generation**

Run:

```bash
git add src/content-store/snapshot.ts tests/content-store/snapshot.test.ts
git commit -m "feat: add published snapshot generation"
```

Expected: commit succeeds.

## Task 6: D1 Schema And Repository

**Files:**
- Create: `db/migrations/0001_initial.sql`
- Create: `src/content-store/d1-store.ts`

- [ ] **Step 1: Create D1 migration**

Create `db/migrations/0001_initial.sql`:

```sql
CREATE TABLE content_contracts (
  site_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  contract_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, version)
);

CREATE TABLE content_items (
  site_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  values_json TEXT NOT NULL,
  extra_sections_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, collection_id, item_id, status)
);

CREATE TABLE published_snapshots (
  site_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, snapshot_id)
);

CREATE TABLE media_assets (
  site_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, asset_id)
);
```

- [ ] **Step 2: Implement D1 content store**

Create `src/content-store/d1-store.ts`:

```ts
import type { ContentItem, ContentStore, ExtraSectionValue, JsonObject, SaveDraftInput } from './types';

function now(): string {
  return new Date().toISOString();
}

function parseJsonObject(value: string): JsonObject {
  return JSON.parse(value) as JsonObject;
}

function parseExtraSections(value: string): ExtraSectionValue[] {
  return JSON.parse(value) as ExtraSectionValue[];
}

function rowToItem(row: Record<string, unknown>): ContentItem {
  return {
    siteId: String(row.site_id),
    collectionId: String(row.collection_id),
    itemId: String(row.item_id),
    status: row.status === 'published' ? 'published' : 'draft',
    values: parseJsonObject(String(row.values_json)),
    extraSections: parseExtraSections(String(row.extra_sections_json)),
    updatedBy: String(row.updated_by),
    updatedAt: String(row.updated_at),
  };
}

export class D1ContentStore implements ContentStore {
  constructor(private readonly db: D1Database) {}

  async saveDraft(input: SaveDraftInput): Promise<ContentItem> {
    const updatedAt = now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO content_items
          (site_id, collection_id, item_id, status, values_json, extra_sections_json, updated_by, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
      )
      .bind(
        input.siteId,
        input.collectionId,
        input.itemId,
        JSON.stringify(input.values),
        JSON.stringify(input.extraSections),
        input.updatedBy,
        updatedAt,
      )
      .run();

    return {
      ...input,
      status: 'draft',
      updatedAt,
    };
  }

  async getDraftItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    return this.getItem(siteId, collectionId, itemId, 'draft');
  }

  async getPublishedItem(siteId: string, collectionId: string, itemId: string): Promise<ContentItem | null> {
    return this.getItem(siteId, collectionId, itemId, 'published');
  }

  async publishDraft(siteId: string, collectionId: string, itemId: string, updatedBy: string): Promise<ContentItem> {
    const draft = await this.getDraftItem(siteId, collectionId, itemId);
    if (!draft) {
      throw new Error(`Draft not found for ${siteId}/${collectionId}/${itemId}`);
    }

    const updatedAt = now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO content_items
          (site_id, collection_id, item_id, status, values_json, extra_sections_json, updated_by, updated_at)
        VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`,
      )
      .bind(
        siteId,
        collectionId,
        itemId,
        JSON.stringify(draft.values),
        JSON.stringify(draft.extraSections),
        updatedBy,
        updatedAt,
      )
      .run();

    return {
      ...draft,
      status: 'published',
      updatedBy,
      updatedAt,
    };
  }

  async listPublishedItems(siteId: string): Promise<ContentItem[]> {
    const result = await this.db
      .prepare(`SELECT * FROM content_items WHERE site_id = ? AND status = 'published' ORDER BY collection_id, item_id`)
      .bind(siteId)
      .all<Record<string, unknown>>();

    return result.results.map(rowToItem);
  }

  private async getItem(
    siteId: string,
    collectionId: string,
    itemId: string,
    status: 'draft' | 'published',
  ): Promise<ContentItem | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM content_items
        WHERE site_id = ? AND collection_id = ? AND item_id = ? AND status = ?`,
      )
      .bind(siteId, collectionId, itemId, status)
      .first<Record<string, unknown>>();

    return row ? rowToItem(row) : null;
  }
}
```

- [ ] **Step 3: Type-check D1 store**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit D1 foundation**

Run:

```bash
git add db/migrations/0001_initial.sql src/content-store/d1-store.ts
git commit -m "feat: add D1 content store"
```

Expected: commit succeeds.

## Task 7: Worker API

**Files:**
- Create: `src/worker/env.ts`
- Create: `src/worker/response.ts`
- Create: `src/worker/routes.ts`
- Create: `src/worker/index.ts`
- Test: `tests/worker/routes.test.ts`

- [ ] **Step 1: Write failing Worker route tests**

Create `tests/worker/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MemoryContentStore } from '../../src/content-store/memory-store';
import { handleApiRequest } from '../../src/worker/routes';

describe('handleApiRequest', () => {
  it('saves a draft through the API', async () => {
    const store = new MemoryContentStore();
    const response = await handleApiRequest(
      new Request('https://cms.test/api/items/draft', {
        method: 'POST',
        body: JSON.stringify({
          siteId: 'demo-site',
          collectionId: 'procedures',
          itemId: 'aft',
          values: { title: 'AFT Fat Transfer' },
          extraSections: [],
          updatedBy: 'owner',
        }),
      }),
      store,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'draft',
      values: { title: 'AFT Fat Transfer' },
    });
  });

  it('exports a published snapshot through the API', async () => {
    const store = new MemoryContentStore();
    await store.saveDraft({
      siteId: 'demo-site',
      collectionId: 'procedures',
      itemId: 'aft',
      values: { title: 'AFT Fat Transfer' },
      extraSections: [],
      updatedBy: 'owner',
    });
    await store.publishDraft('demo-site', 'procedures', 'aft', 'owner');

    const response = await handleApiRequest(new Request('https://cms.test/api/snapshot?siteId=demo-site'), store);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      siteId: 'demo-site',
      collections: {
        procedures: {
          aft: {
            values: { title: 'AFT Fat Transfer' },
          },
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- tests/worker/routes.test.ts
```

Expected: FAIL because Worker routes do not exist.

- [ ] **Step 3: Create Worker env types**

Create `src/worker/env.ts`:

```ts
export interface Env {
  CLASTRO_DB: D1Database;
  CLASTRO_MEDIA: R2Bucket;
  CLASTRO_SITE_ID?: string;
}
```

- [ ] **Step 4: Create JSON response helpers**

Create `src/worker/response.ts`:

```ts
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, { status });
}
```

- [ ] **Step 5: Implement Worker routes**

Create `src/worker/routes.ts`:

```ts
import { createPublishedSnapshot } from '../content-store/snapshot';
import type { ContentStore, SaveDraftInput } from '../content-store/types';
import { errorResponse, jsonResponse } from './response';

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export async function handleApiRequest(request: Request, store: ContentStore): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/api/items/draft') {
    const input = await readJson<SaveDraftInput>(request);
    const draft = await store.saveDraft(input);
    return jsonResponse(draft);
  }

  if (request.method === 'POST' && url.pathname === '/api/items/publish') {
    const input = await readJson<{
      siteId: string;
      collectionId: string;
      itemId: string;
      updatedBy: string;
    }>(request);
    const published = await store.publishDraft(input.siteId, input.collectionId, input.itemId, input.updatedBy);
    return jsonResponse(published);
  }

  if (request.method === 'GET' && url.pathname === '/api/snapshot') {
    const siteId = url.searchParams.get('siteId');
    if (!siteId) {
      return errorResponse('Missing siteId query parameter');
    }
    return jsonResponse(await createPublishedSnapshot(store, siteId));
  }

  return errorResponse('Not found', 404);
}
```

- [ ] **Step 6: Implement Worker entrypoint**

Create `src/worker/index.ts`:

```ts
import { D1ContentStore } from '../content-store/d1-store';
import type { Env } from './env';
import { handleApiRequest } from './routes';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, new D1ContentStore(env.CLASTRO_DB));
    }

    return new Response('Clastro Codex Worker', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
```

- [ ] **Step 7: Run Worker tests and type-check**

Run:

```bash
npm test -- tests/worker/routes.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 8: Commit Worker API**

Run:

```bash
git add src/worker tests/worker/routes.test.ts
git commit -m "feat: add core CMS Worker API"
```

Expected: commit succeeds.

## Task 8: Seed Script And Snapshot Endpoint

**Files:**
- Create: `scripts/seed-example-contract.mjs`
- Create: `src/pages/api-snapshot.json.ts`

- [ ] **Step 1: Create seed script**

Create `scripts/seed-example-contract.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, '.clastro', 'example-snapshot.json');

const snapshot = {
  siteId: 'demo-site',
  generatedAt: new Date().toISOString(),
  collections: {
    procedures: {
      aft: {
        siteId: 'demo-site',
        collectionId: 'procedures',
        itemId: 'aft',
        status: 'published',
        values: {
          title: 'AFT Fat Transfer',
          slug: 'aft-fat-transfer',
          summary: 'A source-backed procedure item used to prove the snapshot shape.',
        },
        extraSections: [
          {
            type: 'recoveryTimeline',
            values: {
              intro: 'Recovery guidance is stored as a per-item extra section.',
            },
          },
        ],
        updatedBy: 'seed',
        updatedAt: new Date().toISOString(),
      },
    },
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
```

- [ ] **Step 2: Create Astro snapshot inspection endpoint**

Create `src/pages/api-snapshot.json.ts`:

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify(
      {
        message: 'Use the Worker /api/snapshot endpoint for live CMS snapshots. Astro can consume exported snapshots during build.',
      },
      null,
      2,
    ),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    },
  );
};
```

- [ ] **Step 3: Run seed script and build**

Run:

```bash
npm run seed:examples
npm run build
```

Expected: `.clastro/example-snapshot.json` is written and Astro build succeeds.

- [ ] **Step 4: Add local snapshot output to gitignore**

Modify `.gitignore` to include:

```gitignore
.clastro/
```

- [ ] **Step 5: Commit seed and endpoint**

Run:

```bash
git add scripts/seed-example-contract.mjs src/pages/api-snapshot.json.ts .gitignore
git commit -m "feat: add example snapshot tooling"
```

Expected: commit succeeds.

## Task 9: Full Verification And Push

**Files:**
- Modify only if verification exposes errors.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: Astro build completes and writes `dist/`.

- [ ] **Step 4: Check Git status**

Run:

```bash
git status --short
```

Expected: only intentional generated files are untracked. `dist/`, `.astro/`, `.wrangler/`, `.clastro/`, and `node_modules/` must remain ignored.

- [ ] **Step 5: Push repository**

Run:

```bash
git branch -M main
git push -u origin main
```

Expected: branch `main` is pushed to `https://github.com/ajnalder/clastro-codex.git`. If the remote repository does not exist, create it with:

```bash
gh repo create ajnalder/clastro-codex --private --source . --remote origin --push
```

Expected: GitHub repository is created and the local `main` branch is pushed.

## Self-Review

Spec coverage in this plan:

- Content contract: Task 2.
- Collections and reusable primitives: Task 2 and Task 3.
- Per-item extra sections: Task 2, Task 3, Task 4, and Task 5.
- Cloudflare D1 storage: Task 6.
- Worker API foundation: Task 7.
- Draft and publish data model: Task 4, Task 5, and Task 6.
- Astro static foundation: Task 1 and Task 8.
- Git repository and push: Task 9.

Intentional gaps for later implementation plans:

- inline WYSIWYG editor
- structured CMS admin UI
- auth
- media upload UI and R2 object writes
- publish-triggered rebuild automation
- analytics integrations
- OpenAI/DataForSEO blog assistance

Scope scan result: no deferred implementation notes or unspecified validation steps remain in this plan.

Type consistency result: `ContentItem`, `SaveDraftInput`, `ContentStore`, `ExtraSectionValue`, `ContentContract`, and `PrimitiveId` names are consistent across tasks.
