/**
 * Format invoice calendar dates (due date, invoice date) without timezone shifts.
 * Date-only values like 2026-06-25 must not pass through UTC parsing.
 */
export function formatInvoiceDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';

  const trimmed = String(dateStr).trim();
  if (!trimmed) return 'N/A';

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const midnightUtcMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(\.000)?Z?$/i);
  if (midnightUtcMatch) {
    return `${midnightUtcMatch[1]}-${midnightUtcMatch[2]}-${midnightUtcMatch[3]}`;
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return 'N/A';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
