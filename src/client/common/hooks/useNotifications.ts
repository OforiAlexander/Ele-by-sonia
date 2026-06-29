import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { AppNotification } from '../types';

export function useNotificationCount(pollIntervalMs = 30_000) {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const res = await axios.get<{ data: { count: number } }>('/api/notifications/unread-count');
            setCount(res.data.data?.count ?? 0);
        } catch {
            // network errors are silent — badge just stays at last known value
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, pollIntervalMs);
        return () => clearInterval(id);
    }, [refresh, pollIntervalMs]);

    return { count, refresh };
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get<{ data: { notifications: AppNotification[] } }>('/api/notifications');
            setNotifications(res.data.data?.notifications ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAllRead = useCallback(async () => {
        await axios.post('/api/notifications/mark-read');
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }, []);

    return { notifications, loading, load, markAllRead };
}
