import { useEffect, useState } from 'react';
import api from '../api';
import { DashSummary } from '../types';

export type { DashSummary };

interface TopProductRow  { productName: string; revenue: string | number }
interface CatBreakdownRow { group: string; revenue: string | number }

const PRODUCT_EXISTENCE_LIMIT = 1;
const TOP_ITEMS_LIMIT = 4;

export function useDashboardSummary() {
  const [data, setData]         = useState<DashSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/products?limit=${PRODUCT_EXISTENCE_LIMIT}`).catch(() => null),
      api.get('/reports/summary?period=annual').catch(() => null),
      api.get(`/reports/top-products?period=annual&limit=${TOP_ITEMS_LIMIT}`).catch(() => null),
      api.get('/reports/chart?period=annual&metric=revenue').catch(() => null),
      api.get('/reports/profit?period=annual&groupBy=category').catch(() => null),
    ]).then(([productsRes, summaryRes, topRes, chartRes, catRes]) => {
      const partial =
        !productsRes || !summaryRes || !topRes || !chartRes || !catRes;

      const totalProducts  = productsRes?.data?.data?.total ?? 0;
      const totalSales     = summaryRes?.data?.data?.revenue ?? 0;
      const topData: TopProductRow[]    = topRes?.data?.data ?? [];
      const topItems       = topData.map((i) => ({ name: i.productName, revenue: Number(i.revenue) }));
      const topSellingItem = topData[0]?.productName ?? '';
      const chart          = chartRes?.data?.data ?? { labels: [], values: [] };
      const catData: CatBreakdownRow[] = catRes?.data?.data ?? [];
      const categories     = catData.slice(0, 4).map((c) => ({ name: c.group, revenue: Number(c.revenue) }));

      setHasError(partial);
      setData({ totalProducts, totalSales, topSellingItem, chart, topItems, categories });
      setLoading(false);
    });
  }, []);

  return { data, loading, hasError };
}
