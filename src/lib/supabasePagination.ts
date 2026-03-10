import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all rows from a Supabase query, bypassing the 1000-row default limit.
 * Works by paginating through results in batches.
 */
export async function fetchAllRows<T = any>(
  tableName: string,
  selectColumns: string,
  filters?: Array<{ column: string; op: 'eq' | 'in' | 'gte' | 'lte' | 'neq'; value: any }>,
  options?: {
    orderBy?: { column: string; ascending?: boolean };
    innerJoinFilter?: string; // e.g., 'purchase.status' for !inner joins
  }
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(tableName)
      .select(selectColumns)
      .range(from, from + PAGE_SIZE - 1);

    // Apply filters
    if (filters) {
      for (const filter of filters) {
        if (filter.op === 'eq') {
          query = query.eq(filter.column, filter.value);
        } else if (filter.op === 'in') {
          query = query.in(filter.column, filter.value);
        } else if (filter.op === 'gte') {
          query = query.gte(filter.column, filter.value);
        } else if (filter.op === 'lte') {
          query = query.lte(filter.column, filter.value);
        } else if (filter.op === 'neq') {
          query = query.neq(filter.column, filter.value);
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    const { data: batch, error } = await query;

    if (error) throw error;

    allData = [...allData, ...(batch as T[] || [])];
    
    if (!batch || batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allData;
}
