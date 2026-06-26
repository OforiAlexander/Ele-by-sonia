import { useEffect, useState } from 'react';
import api from '../api';
import { StockHealthData } from '../types';

export type { StockHealthData };

export function useStockHealth() {
  const [stockHealth, setStockHealth] = useState<StockHealthData | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/reports/stock-health')
      .then((res) => setStockHealth(res.data.data))
      .catch(() => setStockHealth({ healthy: 0, lowStock: 0, outOfStock: 0, total: 0, inventoryValue: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return { stockHealth, loading };
}
