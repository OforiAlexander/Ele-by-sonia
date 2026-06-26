import { useEffect, useState } from 'react';
import api from '../api';
import { DashSummary } from '../types';

export type { DashSummary };

export function useDashboardSummary() {
  const [data, setData]       = useState<DashSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=1').catch(() => null),
      api.get('/reports/summary?period=annual').catch(() => null),
      api.get('/reports/top-products?period=annual&limit=4').catch(() => null),
      api.get('/reports/chart?period=annual&metric=revenue').catch(() => null),
      api.get('/reports/profit?period=annual&groupBy=category').catch(() => null),
    ]).then(([productsRes, summaryRes, topRes, chartRes, catRes]) => {
      const totalProducts  = productsRes?.data?.data?.total ?? 0;
      const totalSales     = summaryRes?.data?.data?.revenue ?? 0;
      const topData: any[] = topRes?.data?.data ?? [];
      const topItems       = topData.map((i: any) => ({ name: i.productName, revenue: Number(i.revenue) }));
      const topSellingItem = topData[0]?.productName ?? '';
      const chart          = chartRes?.data?.data ?? { labels: [], values: [] };
      const catData: any[] = catRes?.data?.data ?? [];
      const categories     = catData.slice(0, 4).map((c: any) => ({ name: c.group, revenue: Number(c.revenue) }));
      setData({ totalProducts, totalSales, topSellingItem, chart, topItems, categories });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
