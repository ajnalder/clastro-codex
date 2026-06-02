# Media-Connected Collection Fields Design

## Purpose

Collection items should use the media library directly. A blog post, service, product, or procedure should not store a loose file path such as `media/example.jpg` when the CMS already has optimized image assets with alt text, captions, dimensions, and variants.

This slice connects collection primitives to media assets:

- `image` for hero images.
- `imageGallery` and `sortableGallery` for multiple images.
- `richText` image insertion for blog bodies and future long-form content.

The goal is reusable CMS plumbing, not a blog-only feature.

## Chosen Approach

Use media asset references as the source of truth for image fields.

An `image` field stores a media asset ID. The editor resolves that ID to the full media asset for preview. A gallery field stores an ordered array of media asset IDs and a selected hero asset ID when needed.

Rich text stores structured content blocks rather than raw HTML in future. For this first implementation slice, the CMS can still render the current text field, but image insertion should create a visible inline image block tied to a media asset reference. That keeps the direction clear without forcing a complete rich-text engine rewrite immediately.

Alternatives considered:

- Keep image fields as file-path strings. This is simple but breaks the media source of truth and makes alt text, variants, and replacement workflows clumsy.
- Create a separate media system per collection type. This gives each screen custom controls but causes the blog, services, products, and procedures sections to drift apart.
- Recommended: one reusable media-field component that works from the primitive type and contract metadata.

## Data Shape

Image field value:

```json
{
  "assetId": "joes-plumbing-van",
  "role": "hero"
}
```

Gallery field value:

```json
{
  "heroAssetId": "product-front",
  "assetIds": ["product-front", "product-side", "product-detail"]
}
```

Rich text image block:

```json
{
  "type": "image",
  "assetId": "blog-inline-leak-diagram",
  "caption": "Optional local caption override"
}
```

The media asset remains the authoritative place for:

- filename
- alt text
- caption
- dimensions
- optimized variants
- upload timestamp

Field-level captions can exist only when the content needs a contextual caption different from the media-library caption.

## CMS UX

### Image Fields

For any `image` primitive, the collection editor should render:

- thumbnail preview when an asset is selected
- filename or asset label
- alt text preview
- `Choose from media`
- `Upload image`
- `Remove`

Uploading from an item field uses the same optimizer as the Media screen. The saved asset is added to the media library automatically and selected for the field.

### Gallery Fields

For `imageGallery` and `sortableGallery`, the collection editor should render:

- thumbnail grid
- `Add from media`
- `Upload images`
- reorder controls
- remove controls
- `Set as hero` where the collection type needs a primary image

V1 can use up/down reorder buttons. Drag and drop is useful later but not required for the first reliable slice.

### Rich Text Fields

For `richText`, the editor should add an image insertion control:

- place cursor or selected insertion point
- choose existing media or upload new media
- insert an inline image block tied to the selected media asset

For this first implementation, the rich-text value can remain simple text plus image markers or a small block array wrapper. The important rule is that inline images reference media asset IDs and any upload appears in the Media library.

## Reusable Components

Create reusable editor units:

- `MediaAssetPicker`: modal or panel that lists media assets and returns selected asset IDs.
- `MediaUploadControl`: uploads and optimizes images using the existing browser optimizer and `/api/media`.
- `ImageFieldEditor`: handles one media asset reference.
- `GalleryFieldEditor`: handles an ordered media asset list and optional hero asset.
- `RichTextEditor`: wraps the current rich-text control and provides image insertion.

These should be driven by primitive type, so future collections do not need special-case screens.

## Blog and Services Demo Scope

Use Joe's Plumbing as the test surface:

- Blog posts get editable `heroImage` with preview, upload, and select.
- Blog post `body` gets insert-image capability.
- Services keep `heroImage`.
- Services also get a `sortableGallery` field to prove gallery behavior for a collection item.

This mirrors future product behavior: products can use a gallery with one hero image, while procedures can use only the hero image or item-specific extra media sections when needed.

## Storage and Publish Flow

Draft collection item values store media references. Media assets are stored immediately because uploaded files must exist before a draft can reference them.

Publishing a collection item should publish the media references as part of the item values. The Astro rebuild then renders optimized image variant URLs into the static site.

The public site should never depend on the editor UI or raw upload objects.

## Error Handling

The editor should clearly handle:

- selected asset no longer exists
- upload fails
- unsupported image type
- media picker has no assets yet
- required hero image is missing
- gallery contains duplicate asset IDs

If upload fails, do not alter the field value.

## Testing

Unit tests should cover:

- media reference normalization for `image` fields
- gallery ordering and hero selection behavior
- CMS view-model resolution from asset IDs to preview data
- rich-text image marker/block insertion
- upload-from-field reuses media upload API behavior

Browser verification should cover:

- blog `heroImage` renders a preview rather than plain file text
- uploading from the blog field creates a media asset and selects it
- reloading the CMS keeps the selected media reference
- service gallery can add, remove, reorder, and mark a hero image
- rich-text image insertion adds an inline image tied to the media library

## Non-Goals

- Full drag-and-drop gallery sorting.
- Full ProseMirror/Tiptap-style rich text engine.
- Cropping, focal points, or art direction per breakpoint.
- AI alt text generation.
- Separate media libraries per collection type.
