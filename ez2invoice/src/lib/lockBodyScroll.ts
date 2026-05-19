let lockCount = 0;
let scrollY = 0;

type SavedStyles = {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
};

let savedStyles: SavedStyles | null = null;

function getScrollbarWidth(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

/** Prevent the document from scrolling (supports nested locks). */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = getScrollbarWidth();

    savedStyles = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: html.style.overflow,
    };

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
}

/** Restore document scrolling when the last lock is released. */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount <= 0) return;

  lockCount -= 1;
  if (lockCount > 0 || !savedStyles) return;

  const body = document.body;
  const html = document.documentElement;

  body.style.overflow = savedStyles.bodyOverflow;
  body.style.position = savedStyles.bodyPosition;
  body.style.top = savedStyles.bodyTop;
  body.style.width = savedStyles.bodyWidth;
  body.style.paddingRight = savedStyles.bodyPaddingRight;
  html.style.overflow = savedStyles.htmlOverflow;

  window.scrollTo(0, scrollY);
  savedStyles = null;
}
