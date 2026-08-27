/** PostgREST returns at most 1000 rows per request unless range() is used. */
export const POSTGREST_PAGE_SIZE = 1000;

export type ShopScope = {
  shopId: string | null;
  isFounder: boolean;
};

export function applyShopScope<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string) => T;
    is: (column: string, value: null) => T;
  }
>(query: T, shopId: string | null, isFounder: boolean): T {
  if (shopId) {
    if (isFounder) {
      return query.or(`shop_id.eq.${shopId},shop_id.is.null`);
    }
    return query.eq('shop_id', shopId);
  }
  if (isFounder) {
    return query.is('shop_id', null);
  }
  return query;
}

export async function fetchAllPagedRows<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }>,
  pageSize = POSTGREST_PAGE_SIZE
): Promise<{ data: T[]; error: { message?: string; code?: string } | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await loadPage(from, to);
    if (error) return { data: [], error };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return { data: rows, error: null };
}

export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(0, page);
  const safeSize = Math.max(1, pageSize);
  const from = safePage * safeSize;
  return { from, to: from + safeSize - 1 };
}
