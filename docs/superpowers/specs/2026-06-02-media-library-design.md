# Media Library V1 Design

## Purpose

Clastro needs a media library for client-managed website images. Editors should be able to upload images, have them converted into web-optimized assets, add alt text and captions, and select those assets from image fields or on-page image controls in subsequent slices.

## Scope

V1 builds the storage and CMS management surface for images. It does not keep original uploads after successful optimization.

Included:

- Media navigation item in the CMS.
- Image upload from the CMS.
- Browser-side conversion of JPEG, PNG, or WebP uploads into WebP variants before upload.
- Variant generation for thumbnail, card, and large website images.
- D1 metadata for each asset.
- R2 object storage for optimized variants in production.
- Local development fallback that keeps the demo usable without real R2.
- Alt text and caption editing.
- Asset grid showing preview, dimensions, format, and file size.

Not included in this first slice:

- Connecting every existing `image` field to the picker.
- Drag-and-drop gallery ordering.
- PDF or non-image file management.
- Keeping raw originals.
- Advanced focal-point cropping.
- AI image analysis or alt text generation.

## Optimization Rule

The editor uploads only optimized image variants. If optimization fails, the upload fails and no original is stored.

The browser creates:

- `thumb`: max width 360px, WebP quality 0.78.
- `card`: max width 900px, WebP quality 0.82.
- `large`: max width 1800px, WebP quality 0.84.

Images smaller than a target width keep their original dimensions for that variant. Aspect ratio is always preserved. Animated images are rejected in V1 because browser canvas conversion would flatten them.

## Data Model

`media_assets` stores one row per logical image:

- `site_id`
- `asset_id`
- `filename`
- `alt_text`
- `caption`
- `content_type`
- `width`
- `height`
- `variants_json`
- `created_at`
- `updated_at`

`variants_json` stores the generated variants:

```json
{
  "thumb": {
    "r2Key": "sites/joes-plumbing/media/asset-id/thumb.webp",
    "url": "/api/media/asset-id/thumb",
    "width": 360,
    "height": 240,
    "bytes": 18420,
    "contentType": "image/webp"
  }
}
```

## Runtime Shape

Client-side upload flow:

1. User chooses an image in the CMS Media screen.
2. Browser decodes the image with `createImageBitmap`.
3. Canvas produces WebP blobs for `thumb`, `card`, and `large`.
4. CMS sends metadata and variant blobs to `/api/media`.
5. Worker stores variants and metadata.
6. CMS reloads or appends the saved asset to the media grid.

Production storage:

- Variants are stored in Cloudflare R2 using deterministic keys.
- D1 stores metadata and variant JSON.
- Public sites use optimized variant URLs only.

Local development storage:

- The demo can store metadata and generated object URLs in memory so the CMS UI is testable without a configured R2 bucket.
- Worker/D1/R2 code remains the production path.

## CMS UX

The Media screen should feel like part of the current CMS:

- Left navigation includes `Media`.
- Main panel shows assets in a compact grid.
- Upload panel accepts one image at a time for V1.
- Each asset has editable `alt text` and `caption`.
- Each asset shows dimensions, WebP file size, and available variants.
- Save state follows the current CMS language: autosaved metadata, publish handled by the site publish flow in a subsequent slice.

## Error Handling

Upload errors are explicit:

- unsupported file type
- image too large to decode in the browser
- canvas conversion failed
- upload failed
- metadata save failed

If any variant fails, the whole upload fails and no asset is created.

## Testing

Unit tests should cover:

- media metadata normalization
- variant manifest creation
- D1 media asset save/list/update behavior
- API routes for creating, listing, and updating media assets
- browser optimizer planning logic that decides target dimensions
- CMS view model for media navigation

Browser verification should cover:

- Media screen opens from CMS navigation.
- Upload panel is visible.
- Existing sample asset previews render.
- Alt text and caption controls update the local editor state.
