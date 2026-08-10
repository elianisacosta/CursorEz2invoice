export const LABOR_CATEGORY_ALL = 'All Categories';

export type LaborRateTypeFilter = 'all' | 'fixed' | 'hourly';

export function laborItemMatchesQuery(
  item: {
    service_name?: string | null;
    category?: string | null;
    description?: string | null;
  },
  searchTerm: string
): boolean {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return true;
  const haystack = [item.service_name, item.category, item.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function laborItemMatchesCategory(
  item: { category?: string | null },
  categoryFilter: string
): boolean {
  if (!categoryFilter || categoryFilter === LABOR_CATEGORY_ALL || categoryFilter === 'All') {
    return true;
  }
  return (item.category || 'General') === categoryFilter;
}

export function laborItemMatchesRateType(
  item: { rate_type?: string | null },
  rateFilter: LaborRateTypeFilter
): boolean {
  if (!rateFilter || rateFilter === 'all') return true;
  return item.rate_type === rateFilter;
}

export function averageHourlyLaborRate(
  items: Array<{ rate_type?: string | null; rate?: number | null }>
): number {
  const hourly = items.filter((item) => item.rate_type === 'hourly');
  if (hourly.length === 0) return 0;
  const sum = hourly.reduce((acc, item) => acc + (Number(item.rate) || 0), 0);
  return sum / hourly.length;
}
