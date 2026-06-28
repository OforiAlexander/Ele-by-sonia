import { useState, useEffect, useRef } from 'react';
import api from '../api';
import type { SearchVariantResult } from '../types';

export function usePosSearch() {
    const [query, setQuery]     = useState('');
    const [results, setResults] = useState<SearchVariantResult[]>([]);
    const [loading, setLoading] = useState(false);
    const initialLoaded = useRef(false);

    const fetchResults = async (q: string) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { limit: 24 };
            if (q.trim().length >= 2) params.q = q.trim();
            const res = await api.get('/variants/search', { params });
            setResults(res.data.data ?? []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Load all products on mount
    useEffect(() => {
        if (!initialLoaded.current) {
            initialLoaded.current = true;
            fetchResults('');
        }
    }, []);

    // Debounced search when query changes
    useEffect(() => {
        if (!initialLoaded.current) return;

        if (query.trim().length === 0) {
            fetchResults('');
            return;
        }
        if (query.trim().length === 1) return;

        const timer = setTimeout(() => fetchResults(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const clearResults = () => setResults([]);

    return { query, setQuery, results, loading, clearResults };
}
