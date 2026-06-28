import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Category } from '../types';

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [tick, setTick]             = useState(0);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<{ data: Category[] }>('/categories')
      .then((res) => {
        if (cancelled) return;
        setCategories(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load categories.');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { categories, loading, error, refetch, setCategories };
}
