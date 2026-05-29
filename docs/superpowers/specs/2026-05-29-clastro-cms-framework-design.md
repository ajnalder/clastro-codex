# Clastro-CMS Framework Design

Date: 2026-05-29

## Summary

Clastro-CMS is a reusable CMS framework for custom Astro sites. It is not a generic page builder and it is not an industry-specific CMS. It gives the developer/LLM a consistent way to define what content exists, where it appears, how it can be edited, and how it is published as a fast static Astro site.

The core philosophy is:

- The developer/LLM shapes the content model during the site build.
- The client edits the finished site safely, without needing to understand the implementation.
- Static page content is edited inline in a private edit mode.
- Repeatable content is managed through structured collections.
- Collection items can have both shared core fields and developer-approved per-item extra sections.
- The public site is always generated through an Astro rebuild, so visitors get static HTML, CSS, and optimized assets with no CMS runtime overhead.

## Product Goals

1. Make custom Astro sites easy for clients to maintain after handoff.
2. Avoid the usual CMS problem where clients edit disconnected forms and cannot see the page context.
3. Avoid the page-builder problem where clients can accidentally damage layout, design, and SEO structure.
4. Give the developer/LLM a reusable framework for making each custom site editable without building a new admin system from scratch.
5. Support simple sites and more complex sites with the same underlying CMS plumbing.
6. Keep the public site extremely fast and SEO-friendly by publishing static Astro output.

## Non-Goals For V1

- Full drag-and-drop page building.
- Arbitrary client-created page layouts.
- Enterprise approval workflows.
- AI editing of procedure, medical, product, or service detail pages.
- A full content campaign planner that replaces SEO/content services.
- Runtime CMS/database reads from the public website.
- Multi-provider AI configuration. V1 uses OpenAI API keys only.

## Core Concept: Same Plumbing, Per-Client Contract

Clastro should provide the same underlying plumbing for every site:

- inline edit mode for static pages
- structured collections for repeatable content
- developer-defined schemas
- per-item extra sections
- reusable content primitives
- media library
- draft autosave
- publish flow
- Astro rebuild
- optional analytics and blog assistance

What changes per client is the content contract. The developer/LLM decides what repeats, what is unique, what the client should be able to edit, and what language the backend should use.

Examples:

- A plastic surgeon may have procedures, cosmetic surgery categories, reconstructive surgery categories, laser/injectable treatments, recovery timelines, galleries, FAQs, and comparison tables.
- A plumber may have services, emergency service callouts, service areas, guarantees, project galleries, price guide tables, and FAQs.
- A product catalogue may have products, SKUs, prices, galleries, variants, categories, specifications, and related products.

The framework stays the same. The client-facing CMS is shaped to match the business.

## Content Contract

The content contract is the developer-facing layer that defines how a site becomes editable. It should describe:

- pages
- page regions
- editable fields
- rich text regions
- image and media fields
- galleries and sortable lists
- links and buttons
- collections
- collection item schemas
- per-item extra sections
- reusable primitives
- validation rules
- source bindings for inline editing
- draft and publish rules
- client-facing labels and grouping

The contract should let the developer/LLM say:

- this heading is editable inline
- this button has editable text and an internal page link
- this homepage card pulls from a procedure item
- this visible CMS-backed field writes back globally to the source item
- this procedure has an extra recovery timeline section
- this product has SKU, price, and a sortable gallery
- this blog post supports AI-assisted draft generation

The contract is the bridge between custom development and a predictable CMS.

## Static Page Editing

Static pages should be edited in an authenticated edit mode that visually resembles the real website. Edit mode is private and dynamic; it is not the public production page.

Every local authored piece of a static page should be editable:

- headings
- eyebrows
- paragraphs
- rich text blocks
- images
- buttons
- links
- card copy
- footer copy
- terms and policy text
- other developer-exposed page content

The client should navigate to the page, enter edit mode, click the visible content, make changes, and save or publish without feeling like they are filling out a detached admin form.

Rich text editing should allow common formatting such as bold, italic, lists, headings where appropriate, and links. The available toolbar should be based on the field type and the design constraints of the component.

Images should open the media library. Buttons should allow editing of the label and link target. Internal links should preferably use page/item references rather than raw URLs when possible.

## CMS-Backed Inline Editing

Static pages can display content sourced from collections, such as featured procedures, top services, recent blog posts, or selected products.

When a client clicks CMS-backed content in edit mode, Clastro should allow inline editing but clearly show the scope:

> Editing globally: Procedure / AFT Fat Transfer / Summary

The default rule is that CMS-backed inline edits write back to the source item globally. This preserves a single source of truth.

Page-specific overrides should exist only when the developer has explicitly allowed them in the content contract. Overrides should not be the default behavior.

## Collections

Clastro should treat repeatable things as collections of items. A collection can represent any repeatable business concept, such as:

- procedures
- services
- products
- blog posts
- team members
- locations
- FAQs
- categories
- testimonials
- case studies
- projects

Each collection has a developer-defined core schema. Examples:

- A procedure may have title, slug, summary, category, hero image, main content, SEO fields, related procedures, and FAQs.
- A product may have title, slug, SKU, price, sale price, stock state, gallery, specifications, category, and SEO fields.
- A blog post may have title, slug, author, publish date, category, hero image, body content, SEO title, meta description, and internal links.

The CMS should not be hard-coded around procedures or blogs. Procedures, products, posts, and services are all item types shaped by the content contract.

## Per-Item Extra Sections

This is a defining Clastro feature.

Traditional CMS models often force every item in a collection to share the exact same fields. That creates oversized forms full of blanks when some items need special content and others do not.

Clastro should allow a collection item to have developer-approved extra sections attached to that specific item.

Examples:

- AFT fat transfer may need a candidate comparison table, recovery timeline, and FAQ cluster.
- Breast reduction may need Medicare criteria notes, before/after guidance, and surgery planning notes.
- A plumber's emergency service page may need urgency messaging and callout pricing.
- A hot water service page may need brand comparison tables and warranty information.
- A product may need a custom specifications table or installation guide.

The client can edit the extra sections that exist on that item, but cannot arbitrarily invent layout. The developer/LLM decides which primitives are appropriate.

## Reusable Primitives

The system should provide reusable editing primitives that can be composed into pages, collection schemas, and per-item extra sections:

- short text
- long text
- rich text
- image
- media file
- image gallery
- sortable gallery
- button/link
- internal content reference
- table
- FAQ list
- callout
- quote/testimonial
- number/currency
- date
- category/tag selection
- related item picker
- SEO metadata

These primitives should be consistent across projects so the developer/LLM can reuse the same mental model and the client sees predictable editing controls.

## Client Information Architecture

The backend navigation should mirror the client's business, not the developer's implementation details.

Example navigation for a plastic surgeon:

- Pages
- Procedures
- Cosmetic Surgery
- Reconstructive Surgery
- Laser and Injectables
- Blog
- Media
- Settings

Example navigation for a plumber:

- Pages
- Services
- Service Areas
- Projects
- Blog
- Media
- Settings

Under the hood, the content contract can implement those areas as one collection with categories or as several collections with shared primitives. The client should not have to care.

The goal is a backend that is structured enough for the owner/editor to understand while still giving the developer enough modeling flexibility.

## Drafts And Publishing

Autosave should always save drafts. Publish should be the deliberate action that makes changes live.

Static page flow:

1. Client enters edit mode.
2. Client edits local page content or CMS-backed content.
3. Clastro autosaves changes as a draft.
4. The editor shows draft/publish state, such as "Saved as draft" and "3 unpublished changes".
5. Client clicks Publish when ready.
6. Clastro validates content and triggers an Astro rebuild.
7. The public site is updated with static output.

Collection item flow:

1. Client edits a structured item.
2. Clastro autosaves the item as a draft.
3. Client publishes the item or affected pages.
4. Clastro validates references and required fields.
5. Publish triggers an Astro rebuild.

V1 should support owner/editor users who can publish their own changes. Approval workflows are out of scope.

## Runtime Architecture

Recommended V1 platform:

- Cloudflare Workers for the private CMS API, authentication, validation, integrations, and publish actions.
- Cloudflare D1 for structured content, drafts, published snapshots, collection definitions, bindings, versions, and CMS settings.
- Cloudflare R2 for media library assets, uploads, PDFs, and images.
- Astro for building the public site.
- Cloudflare Workers Static Assets for serving the built site in the preferred Workers-first deployment path.

The public website should not read from D1 or run CMS/editor code during normal visitor page loads. The production site should receive static Astro output after publish.

## Data Flow

1. Developer/LLM defines the content contract for the site.
2. Clastro stores the contract and uses it to generate editing surfaces.
3. Client edits page content or collection items.
4. Workers API validates and saves drafts to D1.
5. Media uploads are stored in R2 and referenced from D1.
6. Publish creates or updates the published content snapshot.
7. Publish triggers an Astro build.
8. Astro reads the published snapshot and media references through a private build-time API or exported snapshot file.
9. Astro outputs static HTML, CSS, JavaScript where needed, and optimized asset references.
10. Cloudflare serves the public site without CMS runtime overhead.

## Media Library

The media library should support:

- upload
- browse
- search
- select existing image/file
- replace image
- alt text
- captions where relevant
- image metadata
- safe deletion rules
- references from pages and collection items
- gallery ordering

Images and files should live in R2. D1 should store media metadata and references.

## Analytics

Clastro v1 should include simple performance insight, not a full marketing platform.

The CMS should connect to:

- Google Analytics 4 for traffic, engagement, events, conversions, and popular pages.
- Google Search Console for clicks, impressions, CTR, average position, and search queries.

The first version should provide:

- a simple site performance dashboard
- page-level insights for URLs that can be matched to known pages or collection items
- visibility into popular and underperforming pages
- conversion and click event summaries where tracking is configured

Analytics should help clients understand their site without needing to leave the CMS. It should not try to replace deeper SEO strategy or content services.

## AI And Blog Assistance

V1 AI support should be limited to blog/content marketing workflows.

Clients can add their own OpenAI API key. The key should be stored securely and used only from the server-side Workers API. It should never be exposed to the browser.

The system may use the agency's DataForSEO subscription to support:

- keyword ideas
- search volume context
- SERP context
- blog topic opportunities

OpenAI can help with:

- blog topic suggestions
- blog briefs
- outlines
- draft blog posts
- SEO titles
- meta descriptions
- internal-link suggestions

AI output should always be saved as a draft. The owner/editor reviews, edits, and publishes.

AI should not be used in v1 to generate or rewrite procedure, medical, product, or service detail pages. Those remain developer-shaped and human-edited.

## Error Handling

Clastro should distinguish between draft save errors and publish errors.

Draft save errors:

- show a clear "not saved" state
- preserve unsaved local changes in the editor
- retry where safe
- avoid losing user input during navigation

Publish errors:

- block the publish
- show which page/item failed validation
- explain missing required fields, broken references, media problems, or build failures
- keep the existing live site unchanged
- let the user return to the draft and fix the issue

Astro build failures should not break the live site. The previous published build should remain live until a new build succeeds.

## Validation

Validation should come from the content contract.

Examples:

- required title
- unique slug
- required SEO title or fallback behavior
- valid internal link target
- required alt text where appropriate
- table rows must match the configured columns
- gallery must contain allowed media types
- price fields must be numeric
- SKU must be present for products where required
- rich text must only contain allowed marks/nodes

Validation should run before publish and, where helpful, during editing.

## Versioning And Audit Trail

V1 should keep enough history to recover from mistakes:

- draft state
- current published state
- basic version history for pages and collection items
- timestamp of changes
- owner/editor user id for each saved change

This does not need to be a complex approval system in v1. It should simply make edits recoverable.

## Testing Strategy

Implementation should include focused tests around the riskiest contracts:

- content contract parsing and validation
- collection schemas and per-item extra sections
- inline edit bindings writing to the correct source
- CMS-backed inline edits updating the global source item
- draft autosave state
- publish snapshot creation
- Astro build input generation
- media references
- link/reference validation
- AI actions saving only drafts

End-to-end tests should cover:

- editing static page content inline
- changing a CMS-backed field inline and confirming it updates the source item
- editing a collection item with per-item extra sections
- publishing and confirming the public output changes only after publish
- failed publish leaving the previous live site intact

## MVP Scope

The first practical version should focus on:

1. Content contract format.
2. Static page inline editing.
3. Collections with core schemas.
4. Per-item extra sections.
5. Media library using R2.
6. Draft autosave.
7. Publish-to-Astro rebuild.
8. Simple owner/editor auth.
9. Traditional blog CMS.
10. Basic analytics dashboard.
11. OpenAI blog draft support using the client's API key.

The more advanced performance-aware CMS and deeper SEO tooling can grow from this foundation.

## Design Decisions Approved In Discussion

- Clastro is framework-first, not plastic-surgeon-specific.
- Static pages should be edited inline.
- Every local authored static page element should be editable.
- CMS-backed inline edits should update the source item globally by default.
- A visible scope label should tell the client when an edit is global.
- Collections should be generic item types, not just blogs or procedures.
- Collection items should support shared core fields plus developer-approved per-item extras.
- The client should not create arbitrary layout.
- Autosave saves drafts.
- Publish triggers an Astro rebuild.
- The public site should have no CMS runtime overhead.
- Cloudflare Workers, D1, and R2 are the preferred platform pieces.
- V1 uses simple owner/editor publishing, not approvals.
- Analytics should be visible inside the CMS.
- AI should be OpenAI-only in v1 and limited to blog workflows.
- Procedure/service/product detail content should stay human-edited and developer-shaped.
