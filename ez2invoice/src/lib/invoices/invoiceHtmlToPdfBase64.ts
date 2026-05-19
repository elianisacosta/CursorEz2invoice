'use client';

const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;
const CAPTURE_WIDTH_PX = 816;

/** Sample canvas pixels to detect a failed (all-white) capture. */
export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width < 20 || canvas.height < 20) return true;

  const points: [number, number][] = [
    [40, 60],
    [Math.floor(canvas.width / 2), 120],
    [120, Math.floor(canvas.height / 4)],
    [canvas.width - 60, 180],
    [80, Math.min(canvas.height - 40, 400)],
  ];

  let nonWhite = 0;
  for (const [x, y] of points) {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[0] < 240 || pixel[1] < 240 || pixel[2] < 240) {
      nonWhite++;
    }
  }
  return nonWhite === 0;
}

type CaptureOptions = {
  scale?: number;
  foreignObjectRendering?: boolean;
  captureWindow?: Window;
};

async function renderElementToCanvas(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement | null> {
  const html2canvas = (await import('html2canvas')).default;
  const width = element.scrollWidth || CAPTURE_WIDTH_PX;
  const height = Math.max(element.scrollHeight, 200);

  try {
    return await html2canvas(element, {
      scale: options.scale ?? 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: options.foreignObjectRendering ?? false,
      ...(options.captureWindow ? { window: options.captureWindow } : {}),
      onclone: (clonedDoc) => {
        const clonedPage = clonedDoc.querySelector('.print-page') as HTMLElement | null;
        if (clonedPage) {
          clonedPage.style.background = '#ffffff';
          clonedPage.style.color = '#1f2937';
          clonedPage.style.opacity = '1';
          clonedPage.style.visibility = 'visible';
        }
        const body = clonedDoc.body;
        if (body) {
          body.style.background = '#ffffff';
          body.style.margin = '0';
        }
      },
    });
  } catch (error) {
    console.error('[invoiceHtmlToPdfBase64] html2canvas failed:', error);
    return null;
  }
}

async function canvasToPdfBase64(canvas: HTMLCanvasElement): Promise<string | null> {
  const { default: jsPDF } = await import('jspdf');
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

async function elementToPdfBase64(
  element: HTMLElement,
  captureWindow?: Window
): Promise<string | null> {
  const attempts: CaptureOptions[] = [
    { scale: 2, captureWindow },
    { scale: 2, foreignObjectRendering: true, captureWindow },
    { scale: 1.5, captureWindow },
    { scale: 1.5, foreignObjectRendering: true, captureWindow },
    { scale: 2 },
    { scale: 1.5, foreignObjectRendering: true },
  ];

  for (const attempt of attempts) {
    const canvas = await renderElementToCanvas(element, attempt);
    if (!canvas || canvas.width === 0 || canvas.height === 0) continue;
    if (isCanvasBlank(canvas)) {
      console.warn('[invoiceHtmlToPdfBase64] Blank canvas, retrying capture…', attempt);
      continue;
    }

    const base64 = await canvasToPdfBase64(canvas);
    if (base64) return base64;
  }

  return null;
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
