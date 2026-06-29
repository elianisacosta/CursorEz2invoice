export interface InvoiceItemDropdownPosition {
  lineKey: string;
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  openAbove: boolean;
}

export function computeInvoiceItemDropdownPosition(
  anchor: HTMLElement,
  lineKey: string,
  options?: {
    viewportPadding?: number;
    minWidth?: number;
    maxDropdownHeight?: number;
    minDropdownHeight?: number;
    viewport?: { width: number; height: number; offsetTop?: number; offsetLeft?: number };
  }
): InvoiceItemDropdownPosition | null {
  const viewportPadding = options?.viewportPadding ?? 12;
  const minWidth = options?.minWidth ?? 260;
  const maxDropdownHeight = options?.maxDropdownHeight ?? 320;
  const minDropdownHeight = options?.minDropdownHeight ?? 120;

  const rect = anchor.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;

  const visualViewport =
    typeof window !== 'undefined' ? window.visualViewport : null;
  const viewportWidth =
    options?.viewport?.width ?? visualViewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1024);
  const viewportHeight =
    options?.viewport?.height ?? visualViewport?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 768);
  const viewportLeft = options?.viewport?.offsetLeft ?? visualViewport?.offsetLeft ?? 0;
  const viewportTop = options?.viewport?.offsetTop ?? visualViewport?.offsetTop ?? 0;

  const anchorTop = rect.top;
  const anchorBottom = rect.bottom;
  const anchorLeft = rect.left;
  const anchorWidth = Math.max(rect.width, 1);

  const visibleTop = viewportTop + viewportPadding;
  const visibleBottom = viewportTop + viewportHeight - viewportPadding;
  const visibleLeft = viewportLeft + viewportPadding;
  const visibleRight = viewportLeft + viewportWidth - viewportPadding;

  const spaceBelow = Math.max(0, visibleBottom - anchorBottom - 4);
  const spaceAbove = Math.max(0, anchorTop - visibleTop - 4);

  const canOpenBelow = spaceBelow >= minDropdownHeight;
  const canOpenAbove = spaceAbove >= minDropdownHeight;
  const openAbove =
    (!canOpenBelow && canOpenAbove) ||
    (!canOpenBelow && !canOpenAbove && spaceAbove > spaceBelow);

  const maxHeight = Math.max(
    minDropdownHeight,
    Math.min(maxDropdownHeight, openAbove ? spaceAbove : spaceBelow)
  );

  const width = Math.min(Math.max(minWidth, anchorWidth), visibleRight - visibleLeft);

  let left = anchorLeft;
  if (left + width > visibleRight) {
    left = visibleRight - width;
  }
  if (left < visibleLeft) {
    left = visibleLeft;
  }

  // openAbove: top sits on the input edge; CSS translateY(-100%) grows upward.
  // openBelow: top sits directly under the input edge.
  const top = openAbove ? anchorTop - 4 : anchorBottom + 4;

  return {
    lineKey,
    left,
    top,
    width,
    maxHeight,
    openAbove,
  };
}

export function scrollInvoiceItemInputIntoView(anchor: HTMLElement): void {
  anchor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function getInvoiceItemDropdownStyle(position: InvoiceItemDropdownPosition): {
  position: 'fixed';
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  transform?: string;
  zIndex: number;
} {
  return {
    position: 'fixed',
    left: position.left,
    top: position.top,
    width: position.width,
    maxHeight: position.maxHeight,
    transform: position.openAbove ? 'translateY(-100%)' : undefined,
    zIndex: 9999,
  };
}
