'use client';

const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;

/**
 * Capture a visible invoice element and build a multi-page letter PDF.
 * Uses html2canvas directly — jsPDF's .html() often returns blank pages for off-screen nodes.
 */
async function elementToPdfBase64(element: HTMLElement): Promise<string | null> {
  const html2canvas = (await import('html2canvas')).default;
  const { default: jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.scrollWidth || 820,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth || 820,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (clonedDoc) => {
      const clonedPage = clonedDoc.querySelector('.print-page') as HTMLElement | null;
      if (clonedPage) {
        clonedPage.style.background = '#ffffff';
        clonedPage.style.color = '#1f2937';
      }
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    return null;
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  });

  const imgWidth = LETTER_WIDTH_PT;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= LETTER_HEIGHT_PT;

  while (heightLeft > 0) {
    position -= LETTER_HEIGHT_PT;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= LETTER_HEIGHT_PT;
  }

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
