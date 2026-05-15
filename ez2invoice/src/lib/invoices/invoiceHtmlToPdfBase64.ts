'use client';

/**
 * Renders shared invoice HTML/DOM to a PDF base64 string (client-only).
 */
async function elementToPdfBase64(element: HTMLElement): Promise<string | null> {
  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  });

  const pdfWithHtml = pdf as typeof pdf & {
    html: (
      element: HTMLElement,
      options: {
        callback: () => void;
        x: number;
        y: number;
        width: number;
        windowWidth: number;
        autoPaging: string;
        html2canvas: { scale: number; useCORS: boolean; logging: boolean };
      }
    ) => Promise<void>;
  };

  await new Promise<void>((resolve, reject) => {
    pdfWithHtml
      .html(element, {
        callback: () => resolve(),
        x: 0,
        y: 0,
        width: 612,
        windowWidth: 820,
        autoPaging: 'text',
        html2canvas: {
          scale: 0.75,
          useCORS: true,
          logging: false,
        },
      })
      .catch(reject);
  });

  const dataUri = pdf.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return base64 || null;
}

export async function invoiceElementToPdfBase64(element: HTMLElement): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    return await elementToPdfBase64(element);
  } catch (error) {
    console.error('invoiceElementToPdfBase64:', error);
    return null;
  }
}

export async function invoiceHtmlToPdfBase64(html: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  try {
    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc) return null;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    await new Promise((resolve) => setTimeout(resolve, 350));

    const body = frameDoc.body;
    if (!body) return null;

    return await elementToPdfBase64(body);
  } catch (error) {
    console.error('invoiceHtmlToPdfBase64:', error);
    return null;
  } finally {
    document.body.removeChild(iframe);
  }
}
