import React, { useState } from 'react';
import NotificationPanel from './NotificationPanel';
import { useNotificationCount } from '../hooks/useNotifications';

const Notification: React.FC = () => {
    const [opened, setOpened]     = useState(false);
    const { count, refresh }      = useNotificationCount(30_000);

    function handleOpen() {
        setOpened((v) => !v);
    }

    function handleRead() {
        refresh();
    }

    return (
        <NotificationPanel opened={opened} onClose={() => setOpened(false)} onRead={handleRead}>
            <button
                className="topbar-notif"
                aria-label="Notifications"
                onClick={handleOpen}
                style={{ position: 'relative' }}
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5B6B63"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {count > 0 && (
                    <span
                        className="topbar-notif-dot"
                        style={{
                            position:   'absolute',
                            top:        0,
                            right:      0,
                            minWidth:   16,
                            height:     16,
                            borderRadius: 8,
                            background:   '#c0392b',
                            color:        '#fff',
                            fontSize:     10,
                            fontWeight:   700,
                            lineHeight:   '16px',
                            textAlign:    'center',
                            padding:      '0 3px',
                        }}
                    >
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>
        </NotificationPanel>
    );
};

export default Notification;
