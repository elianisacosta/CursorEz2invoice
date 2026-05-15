/** Wait until the shared invoice template has painted in the DOM. */
export async function waitForInvoiceRender(
  container: HTMLElement,
  maxMs = 4000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const page = container.querySelector('.print-page');
    const hasContent = page && (page.textContent?.trim().length ?? 0) > 40;
    if (hasContent) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
