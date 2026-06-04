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
});
