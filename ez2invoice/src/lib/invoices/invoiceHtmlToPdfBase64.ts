'use client';

const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;

/** Sample canvas pixels to detect a failed (all-white) capture. */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width < 20 || canvas.height < 20) return true;

  const points: [number, number][] = [
    [20, 20],
    [Math.floor(canvas.width / 2), 80],
    [80, Math.floor(canvas.height / 3)],
    [canvas.width - 40, 120],
  ];

  let nonWhite = 0;
  for (const [x, y] of points) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[0] < 245 || pixel[1] < 245 || pixel[2] < 245) {
      nonWhite++;
    }
  }
  return nonWhite === 0;
}

async function elementToPdfBase64(
  element: HTMLElement,
  captureWindow?: Window
): Promise<string | null> {
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
    scrollY: 0,
    ...(captureWindow ? { window: captureWindow } : {}),
    onclone: (clonedDoc) => {
      const clonedPage = clonedDoc.querySelector('.print-page') as HTMLElement | null;
      if (clonedPage) {
        clonedPage.style.background = '#ffffff';
        clonedPage.style.color = '#1f2937';
        clonedPage.style.opacity = '1';
        clonedPage.style.visibility = 'visible';
      }
    },
  });

  if (canvas.width === 0 || canvas.height === 0 || isCanvasBlank(canvas)) {
    console.error('[invoiceHtmlToPdfBase64] Canvas capture was empty.');
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

export async function invoiceElementToPdfBase64(
  element: HTMLElement,
  captureWindow?: Window
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    return await elementToPdfBase64(element, captureWindow);
  } catch (error) {
    console.error('invoiceElementToPdfBase64:', error);
    return null;
  }
}
