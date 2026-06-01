# Clastro Build Rules

## Client-Facing Text

Every piece of client-facing site text must be editable unless it is deliberately sourced from a CMS collection item or is true system UI.

Page templates should not contain bare client-facing strings. Each string must be one of:

- `Page editable`: static page copy wrapped as an editable page region, including headings, eyebrows, intros, section headings, captions, CTA labels, footer copy, and similar site content.
- `CMS sourced`: collection-backed content such as service cards, blog post titles, procedure summaries, product names, pricing, SKUs, and categories.
- `System UI`: editor interface labels such as Back to CMS, Publish, toolbar labels, and internal app controls.

CMS-sourced text shown on a static page must get an edit-mode indicator that explains where it is edited and whether changes affect other places on the site.

If a section is visually static but its copy belongs to the client site, it still needs a page-region entry in the content contract and an editable wrapper in the template.
