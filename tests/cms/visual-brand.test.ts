import { describe, expect, it } from 'vitest';
import cmsPage from '../../src/pages/cms.astro?raw';
import clastroLogo from '../../public/images/clastro-logo.svg?raw';

async function readFixture(path: string) {
  // @ts-expect-error Vitest runs this assertion in Node; the app itself does not need Node types.
  const { readFileSync } = await import('fs');
  return readFileSync(new URL(path, import.meta.url), 'utf8') as string;
}

describe('CMS visual brand shell', () => {
  it('uses the Clastro logo asset in the CMS shell', () => {
    expect(cmsPage).toContain('/images/clastro-logo.svg');
    expect(clastroLogo).toContain('<svg');
  });

  it('carries the Clastro navy and cyan admin palette', async () => {
    const cmsCss = await readFixture('../../src/styles/cms.css');

    expect(cmsCss).toContain('--cms-navy: #020024');
    expect(cmsCss).toContain('--cms-cyan: #00b8d9');
  });

  it('renders blog posts through the dedicated writing workspace', () => {
    expect(cmsPage).toContain('cms-blog-workspace');
    expect(cmsPage).toContain('AI Draft Builder');
    expect(cmsPage).toContain('!isBlogWorkspace && activeItem');
  });

  it('keeps the blog editor in writing order with SEO last', () => {
    const coverIndex = cmsPage.indexOf('cms-blog-cover-field');
    const bodyIndex = cmsPage.indexOf('cms-blog-richtext-editor');
    const seoIndex = cmsPage.indexOf('cms-blog-seo-field');

    expect(coverIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeGreaterThan(coverIndex);
    expect(seoIndex).toBeGreaterThan(bodyIndex);
    expect(cmsPage).not.toContain('data-richtext-media-select={activeBlogPost.bodyField.id}');
    expect(cmsPage).toContain('data-richtext-format="h2"');
    expect(cmsPage).toContain('data-richtext-format="h3"');
    expect(cmsPage).toContain('data-richtext-image-picker-open={activeBlogPost.bodyField.id}');
  });
});
