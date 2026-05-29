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
