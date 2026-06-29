import React, { useEffect } from 'react';
import { Popover, ScrollArea, Text, Button, Loader } from '@mantine/core';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';
import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification } from '../types';

const NOTIF_ICONS: Record<string, string> = {
    LOW_STOCK:         '📦',
    OUT_OF_STOCK:      '🚨',
    SALE_VOIDED:       '↩️',
    PRICE_OVERRIDE:    '💰',
    LARGE_DISCOUNT:    '🏷️',
    STOCK_ADJUSTED:    '📉',
    MOMO_CONFIRMED:    '✅',
    MOMO_FAILED:       '❌',
    STAFF_INVITED:     '👤',
    STAFF_DEACTIVATED: '🔒',
    STAFF_REACTIVATED: '🔓',
};

function relativeTime(iso: string): string {
    const diffMs  = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)  return t(KEYS.notifications.justNow);
    if (diffMin < 60) return `${diffMin} ${t(KEYS.notifications.minutesAgo)}`;
    const diffHr  = Math.floor(diffMin / 60);
    if (diffHr < 24)  return `${diffHr} ${t(KEYS.notifications.hoursAgo)}`;
    return `${Math.floor(diffHr / 24)} ${t(KEYS.notifications.daysAgo)}`;
}

interface Props {
    opened:   boolean;
    onClose:  () => void;
    onRead:   () => void;
    children: React.ReactNode;
}

const NotificationPanel: React.FC<Props> = ({ opened, onClose, onRead, children }) => {
    const { notifications, loading, load, markAllRead } = useNotifications();

    useEffect(() => {
        if (opened) load();
    }, [opened, load]);

    async function handleMarkRead() {
        await markAllRead();
        onRead();
    }

    const unread = notifications.filter((n) => !n.read_at).length;

    return (
        <Popover
            opened={opened}
            onClose={onClose}
            position="bottom-end"
            width={340}
            shadow="md"
            withArrow
            arrowSize={10}
        >
            <Popover.Target>{children}</Popover.Target>
            <Popover.Dropdown p={0} style={{ borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid #f0f0f0' }}>
                    <Text fw={600} size="sm">{t(KEYS.notifications.panelTitle)}</Text>
                    {unread > 0 && (
                        <Button size="compact-xs" variant="subtle" color="gray" onClick={handleMarkRead}>
                            {t(KEYS.notifications.markRead)}
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                        <Loader size="sm" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                        <Text size="sm" c="dimmed">{t(KEYS.notifications.empty)}</Text>
                    </div>
                ) : (
                    <ScrollArea h={360}>
                        {notifications.map((n: AppNotification) => (
                            <NotifRow key={n.id} n={n} />
                        ))}
                    </ScrollArea>
                )}
            </Popover.Dropdown>
        </Popover>
    );
};

const NotifRow: React.FC<{ n: AppNotification }> = ({ n }) => {
    const isUnread = !n.read_at;
    const icon     = '🔔';

    return (
        <div style={{
            display:       'flex',
            gap:           10,
            padding:       '10px 16px',
            borderBottom:  '1px solid #f7f7f7',
            background:    isUnread ? '#f6fbf8' : 'transparent',
            cursor:        'default',
        }}>
            <div style={{ fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={isUnread ? 600 : 400} truncate="end">{n.title}</Text>
                {n.body && <Text size="xs" c="dimmed" lineClamp={2}>{n.body}</Text>}
                <Text size="xs" c="dimmed" mt={2}>{relativeTime(n.created_at)}</Text>
            </div>
            {isUnread && (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3db366', flexShrink: 0, marginTop: 6 }} />
            )}
        </div>
    );
};

export default NotificationPanel;
