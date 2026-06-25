import { useEffect, useState } from 'react';
import api from '../api';

export interface StockHealthData {
  healthy:        number;
  lowStock:       number;
  outOfStock:     number;
  total:          number;
  inventoryValue: number;
}

export function useStockHealth() {
  const [stockHealth, setStockHealth] = useState<StockHealthData | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/products?limit=100').catch(() => null).then((res) => {
      const allProds: any[] = res?.data?.data?.products ?? [];
      const variants: any[] = allProds.flatMap((p: any) => p.variants ?? []);
      const healthy        = variants.filter(v => v.stock > v.low_stock_threshold).length;
      const lowStock       = variants.filter(v => v.stock > 0 && v.stock <= v.low_stock_threshold).length;
      const outOfStock     = variants.filter(v => v.stock === 0).length;
      const inventoryValue = variants.reduce((sum, v) => sum + Number(v.cost_price ?? 0) * (v.stock ?? 0), 0);
      setStockHealth({ healthy, lowStock, outOfStock, total: variants.length, inventoryValue });
      setLoading(false);
    });
  }, []);

  return { stockHealth, loading };
}
