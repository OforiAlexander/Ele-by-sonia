import React from 'react';
import { Modal, Text, Button, Stack } from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface Props {
    opened:   boolean;
    onUnlock: () => void;
}

const PosIdleLockOverlay: React.FC<Props> = ({ opened, onUnlock }) => (
    <Modal
        opened={opened}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        centered
        size="sm"
        overlayProps={{ backgroundOpacity: 0.88 }}
    >
        <Stack align="center" gap="md" py="md">
            <svg
                width="48" height="48" viewBox="0 0 24 24"
                fill="none" stroke="#c0392b" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
            >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <Text fw={700} size="lg">{t(KEYS.pos.idleLock.title)}</Text>
            <Text size="sm" c="dimmed" ta="center">{t(KEYS.pos.idleLock.message)}</Text>
            <Button color="green" fullWidth onClick={onUnlock}>
                {t(KEYS.pos.idleLock.unlock)}
            </Button>
        </Stack>
    </Modal>
);

export default PosIdleLockOverlay;
