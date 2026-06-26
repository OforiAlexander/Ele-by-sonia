import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Product, PaginatedProducts } from '../types';

interface UseProductsState {
  products: Product[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
}

interface UseProductsReturn extends UseProductsState {
  limit: number;
  search: string;
  category: string;
  setPage:     (p: number) => void;
  setSearch:   (s: string) => void;
  setCategory: (c: string) => void;
  refetch:     () => void;
}

const LIMIT = 20;

export function useProducts(): UseProductsReturn {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [state, setState]       = useState<UseProductsState>({
    products: [],
    total:    0,
    page:     1,
    loading:  true,
    error:    null,
  });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    const params: Record<string, string | number> = { page, limit: LIMIT };
    if (search)   params.search   = search;
    if (category) params.category = category;

    api
      .get<{ data: PaginatedProducts }>('/products', { params })
      .then((res) => {
        if (cancelled) return;
        const d = res.data.data;
        setState({ products: d.products, total: d.total, page: d.page, loading: false, error: null });
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: 'Failed to load products.' }));
      });

    return () => { cancelled = true; };
  }, [page, search, category, tick]);

  const handleSetSearch = useCallback((s: string) => {
    setSearch(s);
    setPage(1);
  }, []);

  const handleSetCategory = useCallback((c: string) => {
    setCategory(c);
    setPage(1);
  }, []);

  return {
    ...state,
    limit:       LIMIT,
    search,
    category,
    setPage,
    setSearch:   handleSetSearch,
    setCategory: handleSetCategory,
    refetch,
  };
}
