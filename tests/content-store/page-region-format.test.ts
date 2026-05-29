import { describe, expect, it } from 'vitest';
import { normalizePageRegionFormat, resolvePageRegionFormatChange } from '../../src/content-store/page-region-format';

describe('normalizePageRegionFormat', () => {
  it('keeps supported semantic elements and visual sizes', () => {
    expect(normalizePageRegionFormat({ elementType: 'h1', size: 'small' })).toEqual({
      elementType: 'h1',
      size: 'small',
    });
  });

  it('falls back to safe defaults for unknown editor values', () => {
    expect(normalizePageRegionFormat({ elementType: 'script', size: 'tiny' })).toEqual({
      elementType: 'p',
      size: 'default',
    });
  });

  it('preserves the current semantic element when only visual size changes', () => {
    expect(
      resolvePageRegionFormatChange(
        { elementType: 'h2', size: 'default' },
        { size: 'small' },
      ),
    ).toEqual({
      elementType: 'h2',
      size: 'small',
    });
  });
});
