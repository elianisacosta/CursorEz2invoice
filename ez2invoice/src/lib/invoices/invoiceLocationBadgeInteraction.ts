export function handleLocationBadgeClick(
  isOpen: boolean,
  handlers: { onOpen: () => void; onClose: () => void }
): void {
  if (isOpen) handlers.onClose();
  else handlers.onOpen();
}

export function isElementVisibleForInteraction(element: HTMLElement | null): boolean {
  if (!element) return false;
  return element.offsetParent !== null;
}

export function shouldCloseOnOutsidePointer(
  root: HTMLElement | null,
  popover: HTMLElement | null,
  target: Node | null,
  interactionActive: boolean
): boolean {
  if (!interactionActive || !target) return false;
  if (root?.contains(target)) return false;
  if (popover?.contains(target)) return false;
  return true;
}

export function getLocationPopoverPosition(button: HTMLElement): { top: number; left: number } {
  const rect = button.getBoundingClientRect();
  return {
    top: rect.bottom + 4,
    left: rect.left,
  };
}
