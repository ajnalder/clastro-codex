export interface ToolbarRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ToolbarSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface FloatingToolbarPositionInput {
  targetRect: ToolbarRect;
  toolbarSize: ToolbarSize;
  viewportSize: ViewportSize;
  gap?: number;
  margin?: number;
  topReserved?: number;
}

export interface FloatingToolbarPosition {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateFloatingToolbarPosition({
  targetRect,
  toolbarSize,
  viewportSize,
  gap = 12,
  margin = 16,
  topReserved = 58,
}: FloatingToolbarPositionInput): FloatingToolbarPosition {
  const centeredLeft = targetRect.left + targetRect.width / 2 - toolbarSize.width / 2;
  const maxLeft = Math.max(margin, viewportSize.width - toolbarSize.width - margin);
  const left = Math.round(clamp(centeredLeft, margin, maxLeft));
  const aboveTop = targetRect.top - toolbarSize.height - gap;

  if (aboveTop >= topReserved) {
    return {
      left,
      top: Math.round(aboveTop),
      placement: 'above',
    };
  }

  const belowTop = targetRect.top + targetRect.height + gap;
  const maxTop = Math.max(topReserved, viewportSize.height - toolbarSize.height - margin);
  return {
    left,
    top: Math.round(clamp(belowTop, topReserved, maxTop)),
    placement: 'below',
  };
}
