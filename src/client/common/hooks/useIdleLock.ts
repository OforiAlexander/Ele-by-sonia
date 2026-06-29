import { useEffect, useRef } from 'react';

const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;

export function useIdleLock(idleMinutes: number, onLock: () => void): void {
    // Keep onLock in a ref so the effect never needs to re-run when the callback changes.
    const onLockRef = useRef(onLock);
    onLockRef.current = onLock;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!idleMinutes || idleMinutes <= 0) return;

        const delayMs = idleMinutes * 60 * 1000;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => onLockRef.current(), delayMs);
        };

        IDLE_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            IDLE_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
        };
    }, [idleMinutes]);
}
