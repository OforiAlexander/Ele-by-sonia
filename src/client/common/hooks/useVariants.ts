import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import type { Product, ProductVariant, ProductOptionType } from '../types';

interface UseVariantsState {
  product:     Product | null;
  variants:    ProductVariant[];
  optionTypes: ProductOptionType[];
  loading:     boolean;
  error:       string | null;
}

interface UseVariantsReturn extends UseVariantsState {
  refetch:        () => void;
  setVariants:    (fn: (prev: ProductVariant[]) => ProductVariant[]) => void;
  setOptionTypes: (fn: (prev: ProductOptionType[]) => ProductOptionType[]) => void;
}

export function useVariants(productId: string | null): UseVariantsReturn {
  const [state, setState] = useState<UseVariantsState>({
    product:     null,
    variants:    [],
    optionTypes: [],
    loading:     true,
    error:       null,
  });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!productId) {
      setState({ product: null, variants: [], optionTypes: [], loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.all([
      api.get<{ data: Product }>(`/products/${productId}`),
      api.get<{ data: ProductVariant[] }>('/variants', { params: { productId } }),
      api.get<{ data: ProductOptionType[] }>('/variants/option-types', { params: { productId } }),
    ])
      .then(([productRes, variantsRes, optionsRes]) => {
        if (cancelled) return;
        setState({
          product:     productRes.data.data,
          variants:    variantsRes.data.data,
          optionTypes: optionsRes.data.data,
          loading:     false,
          error:       null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: 'Failed to load variants.' }));
      });

    return () => { cancelled = true; };
  }, [productId, tick]);

  const setVariants = useCallback(
    (fn: (prev: ProductVariant[]) => ProductVariant[]) =>
      setState((s) => ({ ...s, variants: fn(s.variants) })),
    [],
  );

  const setOptionTypes = useCallback(
    (fn: (prev: ProductOptionType[]) => ProductOptionType[]) =>
      setState((s) => ({ ...s, optionTypes: fn(s.optionTypes) })),
    [],
  );

  return { ...state, refetch, setVariants, setOptionTypes };
}
