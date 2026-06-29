import React, { useState } from 'react';
import { Group, Stack, Text, ActionIcon, NumberInput, Tooltip, Badge } from '@mantine/core';
import type { PosCartItem } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { useCurrency } from '../../hooks/useCurrency';

interface Props {
    item:            PosCartItem;
    canOverride:     boolean;
    onUpdateQty:     (variantId: string, qty: number) => void;
    onRemove:        (variantId: string) => void;
    onSetOverride:   (variantId: string, price: number | null) => void;
}

const PosCartItem: React.FC<Props> = ({ item, canOverride, onUpdateQty, onRemove, onSetOverride }) => {
    const { formatPrice } = useCurrency();
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [overrideInput, setOverrideInput] = useState<number | string>(item.originalPrice);

    const toggleOverride = () => {
        if (overrideOpen) {
            onSetOverride(item.variantId, null);
            setOverrideInput(item.originalPrice);
        }
        setOverrideOpen((o) => !o);
    };

    const applyOverride = (val: number | string) => {
        setOverrideInput(val);
        const num = typeof val === 'number' ? val : Number(val);
        if (!isNaN(num) && num >= 0) {
            onSetOverride(item.variantId, num);
        }
    };

    const lineTotal = item.price * item.quantity;

    return (
        <Stack gap={4} py={10} style={{ borderBottom: '1px solid #ECEFEC' }}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} lineClamp={1}>{item.productName}</Text>
                    <Group gap={6} wrap="nowrap">
                        {item.variantLabel && item.variantLabel !== item.productName && (
                            <Text size="xs" c="dimmed" lineClamp={1}>{item.variantLabel}</Text>
                        )}
                        {item.sku && (
                            <Badge size="xs" variant="outline" color="gray">{item.sku}</Badge>
                        )}
                    </Group>
                    <Group gap={6} align="center">
                        {item.unitPriceOverride !== null ? (
                            <>
                                <Text size="xs" td="line-through" c="dimmed">{formatPrice(item.originalPrice)}</Text>
                                <Text size="xs" c="orange" fw={600}>{formatPrice(item.price)}</Text>
                            </>
                        ) : (
                            <Text size="xs" c="dimmed">{formatPrice(item.price)} each</Text>
                        )}
                    </Group>
                </Stack>

                <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                    <Text size="sm" fw={700}>{formatPrice(lineTotal)}</Text>
                    <Group gap={4} wrap="nowrap">
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={() => onUpdateQty(item.variantId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </ActionIcon>
                        <Text size="sm" fw={600} w={22} ta="center">{item.quantity}</Text>
                        <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="green"
                            onClick={() => onUpdateQty(item.variantId, item.quantity + 1)}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </ActionIcon>
                    </Group>
                </Stack>
            </Group>

            <Group gap={8} mt={2}>
                {canOverride && (
                    <Tooltip label={overrideOpen ? t(KEYS.pos.item.resetOverride) : t(KEYS.pos.item.overridePrice)}>
                        <Text
                            size="xs"
                            c={overrideOpen ? 'orange' : 'dimmed'}
                            style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                            onClick={toggleOverride}
                        >
                            {overrideOpen ? t(KEYS.pos.item.resetOverride) : t(KEYS.pos.item.overridePrice)}
                        </Text>
                    </Tooltip>
                )}
                {overrideOpen && canOverride && (
                    <NumberInput
                        size="xs"
                        style={{ width: 100 }}
                        min={0}
                        decimalScale={2}
                        fixedDecimalScale
                        value={overrideInput}
                        onChange={applyOverride}
                        prefix="₵"
                        hideControls
                    />
                )}
                <Text
                    size="xs"
                    c="red"
                    style={{ cursor: 'pointer', marginLeft: 'auto' }}
                    onClick={() => onRemove(item.variantId)}
                >
                    {t(KEYS.pos.item.remove)}
                </Text>
            </Group>
        </Stack>
    );
};

export default PosCartItem;
