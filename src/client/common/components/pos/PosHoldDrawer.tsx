import React from 'react';
import { Drawer, Stack, Group, Text, Button, Center } from '@mantine/core';
import type { HeldCart } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { showConfirm } from '../../utils/swal';

interface Props {
    opened:       boolean;
    onClose:      () => void;
    heldCarts:    HeldCart[];
    hasActiveCart: boolean;
    onRecall:     (id: string) => void;
    onDelete:     (id: string) => void;
}

const PosHoldDrawer: React.FC<Props> = ({ opened, onClose, heldCarts, hasActiveCart, onRecall, onDelete }) => {
    const handleRecall = async (cart: HeldCart) => {
        if (hasActiveCart) {
            const ok = await showConfirm(t(KEYS.pos.hold.confirmReplace), t(KEYS.pos.hold.confirmReplaceText));
            if (!ok.isConfirmed) return;
        }
        onRecall(cart.id);
        onClose();
    };

    const formatSavedTime = (ts: number) =>
        new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={t(KEYS.pos.hold.drawerTitle)}
            position="right"
            size="sm"
        >
            {heldCarts.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed" size="sm">{t(KEYS.pos.hold.empty)}</Text>
                </Center>
            ) : (
                <Stack gap="md">
                    {heldCarts.map((cart) => (
                        <div
                            key={cart.id}
                            style={{
                                border: '1px solid #ECEFEC',
                                borderRadius: 8,
                                padding: '12px 14px',
                            }}
                        >
                            <Group justify="space-between" mb={4}>
                                <Text size="sm" fw={600}>{cart.label}</Text>
                                <Text size="xs" c="dimmed">
                                    {t(KEYS.pos.hold.savedLabel)} {formatSavedTime(cart.savedAt)}
                                </Text>
                            </Group>
                            <Text size="xs" c="dimmed" mb={10}>
                                {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
                                {' · '}
                                {cart.items.map((i) => i.productName).join(', ')}
                            </Text>
                            <Group gap={8}>
                                <Button
                                    size="xs"
                                    color="green"
                                    variant="light"
                                    onClick={() => handleRecall(cart)}
                                >
                                    {t(KEYS.pos.hold.recall)}
                                </Button>
                                <Button
                                    size="xs"
                                    color="red"
                                    variant="subtle"
                                    onClick={() => onDelete(cart.id)}
                                >
                                    {t(KEYS.pos.hold.deleteLabel)}
                                </Button>
                            </Group>
                        </div>
                    ))}
                </Stack>
            )}
        </Drawer>
    );
};

export default PosHoldDrawer;
