import React, { useState, useEffect, useCallback } from 'react';
import {
    Group, Text, Button, Badge, Select, Table, Pagination,
    Drawer, Stack, Divider, Loader, Center,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { Link } from 'react-router-dom';
import api from '../../../common/api';
import { useAuth } from '../../../common/context/AuthContext';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { formatPrice } from '../../../common/utils/formatCurrency';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import type { Sale } from '../../../common/types';

const PAGE_SIZE = 20;

function statusBadge(sale: Sale) {
    if (sale.voided_at) return <Badge color="gray" size="sm">{t(KEYS.salesHistory.status.voided)}</Badge>;
    if (sale.payment_status === 'paid')    return <Badge color="green" size="sm">{t(KEYS.salesHistory.status.paid)}</Badge>;
    if (sale.payment_status === 'pending') return <Badge color="yellow" size="sm">{t(KEYS.salesHistory.status.pending)}</Badge>;
    if (sale.payment_status === 'failed')  return <Badge color="red" size="sm">{t(KEYS.salesHistory.status.failed)}</Badge>;
    return <Badge size="sm">{sale.payment_status}</Badge>;
}

function methodBadge(method: string) {
    if (method === 'momo') return <Badge color="yellow" size="xs" variant="light">Mobile Money</Badge>;
    if (method === 'cash') return <Badge color="green" size="xs" variant="light">Cash</Badge>;
    return <Badge size="xs" variant="light">{method}</Badge>;
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const SalesHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const canVoid = user?.is_owner || !!user?.can_void_sales;

    const [sales, setSales]       = useState<Sale[]>([]);
    const [total, setTotal]       = useState(0);
    const [page, setPage]         = useState(1);
    const [loading, setLoading]   = useState(false);

    const [filterFrom,   setFilterFrom]   = useState<Date | null>(null);
    const [filterTo,     setFilterTo]     = useState<Date | null>(null);
    const [filterMethod, setFilterMethod] = useState<string | null>(null);

    const [detailSale, setDetailSale]       = useState<Sale | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [voiding, setVoiding]             = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const fetchSales = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page: p,
                limit: PAGE_SIZE,
                include_voided: 'true',
            };
            if (filterFrom)   params.from = filterFrom.toISOString().slice(0, 10);
            if (filterTo)     params.to   = filterTo.toISOString().slice(0, 10);
            if (filterMethod) params.payment_method = filterMethod;

            const res = await api.get('/sales', { params });
            setSales(res.data.data.sales ?? []);
            setTotal(res.data.data.total ?? 0);
        } catch {
            setSales([]);
        } finally {
            setLoading(false);
        }
    }, [filterFrom, filterTo, filterMethod]);

    useEffect(() => {
        fetchSales(page);
    }, [fetchSales, page]);

    const handleFilterApply = () => {
        setPage(1);
        fetchSales(1);
    };

    const openDetail = async (sale: Sale) => {
        setDetailSale(sale);
        setDetailLoading(true);
        try {
            const res = await api.get(`/sales/${sale.id}`);
            setDetailSale(res.data.data);
        } catch {
            // keep the list-level data if detail load fails
        } finally {
            setDetailLoading(false);
        }
    };

    const handleVoid = async () => {
        if (!detailSale) return;
        const ok = await showConfirm(
            t(KEYS.salesHistory.void.confirmTitle),
            t(KEYS.salesHistory.void.confirmText),
        );
        if (!ok.isConfirmed) return;
        setVoiding(true);
        try {
            await api.post(`/sales/${detailSale.id}/void`);
            showSuccess(t(KEYS.salesHistory.void.success), '');
            setDetailSale(null);
            fetchSales(page);
        } catch {
            showError(t(KEYS.common.error), t(KEYS.salesHistory.void.error));
        } finally {
            setVoiding(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Group justify="space-between" align="flex-start">
                    <div>
                        <h1 className="ptitle">{t(KEYS.salesHistory.title)}</h1>
                        <p className="psub">{t(KEYS.salesHistory.subtitle)}</p>
                    </div>
                    <Button component={Link} to="/pos" color="green" size="sm">
                        {t(KEYS.salesHistory.newSale)}
                    </Button>
                </Group>
            </div>

            {/* Filters */}
            <Group mb="md" gap="sm" align="flex-end" wrap="wrap">
                <DatePickerInput
                    label={t(KEYS.salesHistory.filter.from)}
                    placeholder="Pick date"
                    value={filterFrom}
                    onChange={(v) => setFilterFrom(v)}
                    clearable
                    size="sm"
                    style={{ width: 160 }}
                />
                <DatePickerInput
                    label={t(KEYS.salesHistory.filter.to)}
                    placeholder="Pick date"
                    value={filterTo}
                    onChange={(v) => setFilterTo(v)}
                    clearable
                    size="sm"
                    style={{ width: 160 }}
                />
                <Select
                    label={t(KEYS.salesHistory.filter.method)}
                    placeholder={t(KEYS.salesHistory.filter.allMethods)}
                    value={filterMethod}
                    onChange={setFilterMethod}
                    data={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'momo', label: 'Mobile Money' },
                    ]}
                    clearable
                    size="sm"
                    style={{ width: 170 }}
                />
                <Button size="sm" color="green" onClick={handleFilterApply} style={{ marginTop: 24 }}>
                    Apply
                </Button>
                {(filterFrom || filterTo || filterMethod) && (
                    <Button
                        size="sm"
                        variant="subtle"
                        color="gray"
                        style={{ marginTop: 24 }}
                        onClick={() => {
                            setFilterFrom(null);
                            setFilterTo(null);
                            setFilterMethod(null);
                            setPage(1);
                        }}
                    >
                        Clear
                    </Button>
                )}
            </Group>

            {/* Table */}
            {loading ? (
                <Center py="xl"><Loader size="sm" /></Center>
            ) : sales.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed" size="sm">{t(KEYS.salesHistory.empty)}</Text>
                </Center>
            ) : (
                <>
                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t(KEYS.salesHistory.table.saleNumber)}</Table.Th>
                                <Table.Th>{t(KEYS.salesHistory.table.date)}</Table.Th>
                                <Table.Th>{t(KEYS.salesHistory.table.cashier)}</Table.Th>
                                <Table.Th>{t(KEYS.salesHistory.table.method)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.salesHistory.table.amount)}</Table.Th>
                                <Table.Th>{t(KEYS.salesHistory.table.status)}</Table.Th>
                                <Table.Th>{t(KEYS.salesHistory.table.actions)}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {sales.map((sale) => (
                                <Table.Tr
                                    key={sale.id}
                                    style={{ opacity: sale.voided_at ? 0.6 : 1 }}
                                >
                                    <Table.Td>
                                        <Text size="sm" fw={600} ff="monospace">{sale.sale_number}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{formatDateTime(sale.created_at)}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{sale.staff?.name ?? '—'}</Text>
                                    </Table.Td>
                                    <Table.Td>{methodBadge(sale.payment_method)}</Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Text size="sm" fw={600}>{formatPrice(Number(sale.amount_due))}</Text>
                                    </Table.Td>
                                    <Table.Td>{statusBadge(sale)}</Table.Td>
                                    <Table.Td>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="green"
                                            onClick={() => openDetail(sale)}
                                        >
                                            View
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    {totalPages > 1 && (
                        <Group justify="center" mt="lg">
                            <Pagination
                                total={totalPages}
                                value={page}
                                onChange={setPage}
                                color="green"
                                size="sm"
                            />
                        </Group>
                    )}
                </>
            )}

            {/* Detail Drawer */}
            <Drawer
                opened={!!detailSale}
                onClose={() => setDetailSale(null)}
                title={detailSale ? `${t(KEYS.salesHistory.detail.title)} — ${detailSale.sale_number}` : t(KEYS.salesHistory.detail.title)}
                position="right"
                size="md"
            >
                {detailLoading ? (
                    <Center py="xl"><Loader size="sm" /></Center>
                ) : detailSale ? (
                    <Stack gap="sm">
                        {/* Meta info */}
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.date)}</Text>
                            <Text size="sm">{formatDateTime(detailSale.created_at)}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.cashier)}</Text>
                            <Text size="sm">{detailSale.staff?.name ?? '—'}</Text>
                        </Group>
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.method)}</Text>
                            {methodBadge(detailSale.payment_method)}
                        </Group>
                        {Number(detailSale.discount) > 0 && (
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.discount)}</Text>
                                <Text size="sm" c="red">- {formatPrice(Number(detailSale.discount))}</Text>
                            </Group>
                        )}
                        <Group justify="space-between">
                            <Text size="sm" fw={700}>{t(KEYS.salesHistory.detail.amount)}</Text>
                            <Text size="sm" fw={700}>{formatPrice(Number(detailSale.amount_due))}</Text>
                        </Group>
                        {detailSale.change_given && Number(detailSale.change_given) > 0 && (
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">{t(KEYS.salesHistory.detail.change)}</Text>
                                <Text size="sm">{formatPrice(Number(detailSale.change_given))}</Text>
                            </Group>
                        )}
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">Status</Text>
                            {statusBadge(detailSale)}
                        </Group>

                        <Divider my="xs" />

                        {/* Line items */}
                        <Text size="sm" fw={600}>{t(KEYS.salesHistory.detail.itemsTitle)}</Text>
                        {detailSale.items && detailSale.items.length > 0 ? (
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
                                    {detailSale.items.map((item) => (
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
                            <Text size="sm" c="dimmed">No item detail available.</Text>
                        )}

                        {/* Void action */}
                        {canVoid && !detailSale.voided_at && detailSale.payment_status === 'paid' && (
                            <>
                                <Divider my="xs" />
                                <Button
                                    color="red"
                                    variant="light"
                                    loading={voiding}
                                    onClick={handleVoid}
                                    fullWidth
                                >
                                    {t(KEYS.salesHistory.detail.voidBtn)}
                                </Button>
                            </>
                        )}

                        <Button
                            variant="subtle"
                            color="gray"
                            onClick={() => setDetailSale(null)}
                            fullWidth
                        >
                            {t(KEYS.salesHistory.detail.close)}
                        </Button>
                    </Stack>
                ) : null}
            </Drawer>
        </div>
    );
};

export default SalesHistoryPage;
