import { describe, expect, it } from 'vitest';
import { calculateFloatingToolbarPosition } from '../../src/joe-plumbing/toolbar-position';

describe('calculateFloatingToolbarPosition', () => {
  it('centers the toolbar above the active editable region', () => {
    expect(
      calculateFloatingToolbarPosition({
        targetRect: { top: 260, left: 300, width: 420, height: 80 },
        toolbarSize: { width: 300, height: 48 },
        viewportSize: { width: 1200, height: 800 },
      }),
    ).toEqual({
      left: 360,
      top: 200,
      placement: 'above',
    });
  });

  it('clamps the toolbar inside the viewport horizontally', () => {
    expect(
      calculateFloatingToolbarPosition({
        targetRect: { top: 260, left: 20, width: 120, height: 80 },
        toolbarSize: { width: 360, height: 48 },
        viewportSize: { width: 1200, height: 800 },
      }).left,
    ).toBe(16);
  });

  it('places the toolbar below the region when the top bar would crowd it', () => {
    expect(
      calculateFloatingToolbarPosition({
        targetRect: { top: 88, left: 300, width: 420, height: 70 },
        toolbarSize: { width: 300, height: 48 },
        viewportSize: { width: 1200, height: 800 },
      }),
    ).toEqual({
      left: 360,
      top: 170,
      placement: 'below',
    });
  });
});
