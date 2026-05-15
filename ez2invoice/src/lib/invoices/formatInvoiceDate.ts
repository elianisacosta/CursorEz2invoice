/** Format YYYY-MM-DD in local timezone (avoids UTC off-by-one from toISOString). */
export function formatInvoiceDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
