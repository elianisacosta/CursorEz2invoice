/** Strip to digits for search, duplicate detection, and storage comparison. */
export function normalizePhoneForLookup(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

function extractUsPhoneDigits(value: string, maxDigits = 11): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 10) return digits.slice(0, 10);
  if (digits.startsWith('1')) return digits.slice(0, 11);
  return digits.slice(0, 10);
}

/** Format a stored or partial phone value for display. */
export function formatUsPhoneDisplay(value: string | null | undefined, fallback = ''): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return trimmed;
}

/** @deprecated alias used in a few UI call sites */
export const formatPhoneNumber = formatUsPhoneDisplay;

/** Progressive formatting while the user types in a phone input. */
export function formatPhoneInputValue(value: string): string {
  const digits = extractUsPhoneDigits(value);
  if (!digits) return '';

  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    if (local.length <= 3) return `+1 (${local}`;
    if (local.length <= 6) return `+1 (${local.slice(0, 3)}) ${local.slice(3)}`;
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 10)}`;
  }

  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Preserve cursor position after reformatting a phone input value. */
export function formatPhoneInputWithCursor(
  value: string,
  selectionStart: number
): { formatted: string; cursor: number } {
  const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, '').length;
  const formatted = formatPhoneInputValue(value);

  if (digitsBeforeCursor <= 0) {
    return { formatted, cursor: 0 };
  }

  let seenDigits = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      seenDigits += 1;
      if (seenDigits === digitsBeforeCursor) {
        return { formatted, cursor: index + 1 };
      }
    }
  }

  return { formatted, cursor: formatted.length };
}

/** Store US numbers as digits; preserve unusual/international values as entered. */
export function serializePhoneForStorage(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits;

  return trimmed;
}
