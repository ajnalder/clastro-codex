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
