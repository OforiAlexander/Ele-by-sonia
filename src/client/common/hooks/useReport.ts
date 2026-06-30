import { useEffect, useState } from 'react';
import api from '../api';

export function useReport<T>(endpoint: string, params: Record<string, string | number | undefined>): {
    data:    T | null;
    loading: boolean;
    error:   boolean;
} {
    const [data, setData]       = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(false);

    const paramsKey = JSON.stringify(params);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);

        api.get(endpoint, { params })
            .then((res) => {
                if (cancelled) return;
                setData(res.data.data ?? null);
            })
            .catch(() => {
                if (cancelled) return;
                setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [endpoint, paramsKey]);

    return { data, loading, error };
}
