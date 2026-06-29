import React from 'react';
import {
    Drawer, Stack, Group, Text, Button, Divider,
    Table, Center, Loader,
} from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { useCurrency } from '../../hooks/useCurrency';
import { formatDateTime } from '../../utils/dateUtils';
import SaleStatusBadge from './SaleStatusBadge';
import SaleMethodLabel from './SaleMethodLabel';
import type { Sale } from '../../types';

interface Props {
    sale:     Sale | null;
    loading:  boolean;
    canVoid:  boolean;
    voiding:  boolean;
    onClose:  () => void;
    onVoid:   () => void;
}

const SaleDetailDrawer: React.FC<Props> = ({ sale, loading, canVoid, voiding, onClose, onVoid }) => {
    const { formatPrice } = useCurrency();
    return (
    <Drawer
        opened={!!sale}
        onClose={onClose}
        title={sale
            ? `${t(KEYS.salesHistory.detail.title)} — ${sale.sale_number}`
            : t(KEYS.salesHistory.detail.title)
        }
        position="right"
        size="md"
    >
        {loading ? (
            <Center py="xl"><Loader size="sm" /></Center>
        ) : sale ? (
            <Stack gap="sm">
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.date)}</Text>
                    <Text size="sm">{formatDateTime(sale.created_at)}</Text>
                </Group>
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.cashier)}</Text>
                    <Text size="sm">{sale.staff?.name ?? '—'}</Text>
                </Group>
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.method)}</Text>
                    <SaleMethodLabel method={sale.payment_method} />
                </Group>
                {Number(sale.discount) > 0 && (
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.discount)}</Text>
                        <Text size="sm" c="red">- {formatPrice(Number(sale.discount))}</Text>
                    </Group>
                )}
                <Group justify="space-between">
                    <Text size="sm" fw={700}>{t(KEYS.salesHistory.detail.amount)}</Text>
                    <Text size="sm" fw={700}>{formatPrice(Number(sale.amount_due))}</Text>
                </Group>
                {sale.change_given && Number(sale.change_given) > 0 && (
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.change)}</Text>
                        <Text size="sm">{formatPrice(Number(sale.change_given))}</Text>
                    </Group>
                )}
                <Group justify="space-between">
                    <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.statusLabel)}</Text>
                    <SaleStatusBadge status={sale.payment_status} voided={!!sale.voided_at} />
                </Group>

                <Divider my="xs" />

                <Text size="sm" fw={600}>{t(KEYS.salesHistory.detail.itemsTitle)}</Text>
                {sale.items && sale.items.length > 0 ? (
                    <Table withTableBorder withColumnBorders style={{ fontSize: 12 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t(KEYS.salesHistory.detail.itemProduct)}</Table.Th>
                                <Table.Th style={{ textAlign: 'center' }}>{t(KEYS.salesHistory.detail.itemQty)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.salesHistory.detail.itemPrice)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.salesHistory.detail.itemTotal)}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {sale.items.map((item) => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>
                                        <Text size="xs" fw={600}>{item.variant?.product_name ?? '—'}</Text>
                                        {item.variant?.sku && (
                                            <Text size="xs" c="dimmed">{item.variant.sku}</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'center' }}>{item.quantity}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatPrice(Number(item.unit_price))}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>{formatPrice(Number(item.line_total))}</Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.noItems)}</Text>
                )}

                {canVoid && !sale.voided_at && sale.payment_status === 'paid' && (
                    <>
                        <Divider my="xs" />
                        <Button color="red" variant="light" loading={voiding} onClick={onVoid} fullWidth>
                            {t(KEYS.salesHistory.detail.voidBtn)}
                        </Button>
                    </>
                )}

                <Button variant="subtle" color="gray" onClick={onClose} fullWidth>
                    {t(KEYS.salesHistory.detail.close)}
                </Button>
            </Stack>
        ) : null}
    </Drawer>
    );
};

export default SaleDetailDrawer;
