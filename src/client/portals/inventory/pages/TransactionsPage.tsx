import React, { useState, useEffect, useCallback } from 'react';
import {
    Group, Text, Table, Pagination,
    Stack, Loader, Center, SimpleGrid, Button,
} from '@mantine/core';
import api from '../../../common/api';
import { useAuth } from '../../../common/context/AuthContext';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { useCurrency } from '../../../common/hooks/useCurrency';
import { formatDateTime, toLocalDate } from '../../../common/utils/dateUtils';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import SaleStatusBadge from '../../../common/components/sales/SaleStatusBadge';
import SaleMethodLabel from '../../../common/components/sales/SaleMethodLabel';
import SaleStatCard from '../../../common/components/sales/SaleStatCard';
import SalesFilterBar from '../../../common/components/sales/SalesFilterBar';
import type { Sale, TransactionStats } from '../../../common/types';

const PAGE_SIZE    = 25;
const CODE_CONFIRMED = 'PAYMENT_CONFIRMED';

const TransactionsPage: React.FC = () => {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const canVerify = user?.is_owner || !!user?.can_verify_payment;

    const [sales, setSales]     = useState<Sale[]>([]);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const [loading, setLoading] = useState(false);
    const [stats, setStats]     = useState<TransactionStats | null>(null);

    const [filterFrom,   setFilterFrom]   = useState<Date | null>(null);
    const [filterTo,     setFilterTo]     = useState<Date | null>(null);
    const [filterMethod, setFilterMethod] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasFilters = !!(filterFrom || filterTo || filterMethod || filterStatus);

    const fetchSales = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page:           p,
                limit:          PAGE_SIZE,
                include_voided: 'false',
                include_stats:  'true',
            };
            if (filterFrom)   params.from           = toLocalDate(filterFrom);
            if (filterTo)     params.to             = toLocalDate(filterTo);
            if (filterMethod) params.payment_method = filterMethod;
            if (filterStatus) params.payment_status = filterStatus;

            const res = await api.get('/sales', { params });
            setSales(res.data.data.sales ?? []);
            setTotal(res.data.data.total ?? 0);
            setStats(res.data.data.stats ?? null);
        } catch {
            setSales([]);
        } finally {
            setLoading(false);
        }
    }, [filterFrom, filterTo, filterMethod, filterStatus]);

    useEffect(() => {
        fetchSales(page);
    }, [fetchSales, page]);

    const handleApply = () => { setPage(1); fetchSales(1); };

    const handleClear = () => {
        setFilterFrom(null);
        setFilterTo(null);
        setFilterMethod(null);
        setFilterStatus(null);
        setPage(1);
    };

    const handleVerify = async (sale: Sale) => {
        const ok = await showConfirm(
            t(KEYS.transactions.verify.confirmTitle),
            t(KEYS.transactions.verify.confirmText),
        );
        if (!ok.isConfirmed) return;

        setVerifyingId(sale.id);
        try {
            const res = await api.post(`/sales/${sale.id}/verify-payment`);
            if (res.data.code === CODE_CONFIRMED) {
                showSuccess(
                    t(KEYS.transactions.verify.successTitle),
                    t(KEYS.transactions.verify.successText),
                );
                setSales((prev) =>
                    prev.map((s) => s.id === sale.id ? { ...s, payment_status: 'paid' } : s),
                );
                setStats((prev) => prev ? {
                    ...prev,
                    momoTotal:    prev.momoTotal    + Number(sale.amount_due),
                    pendingTotal: Math.max(0, prev.pendingTotal - Number(sale.amount_due)),
                } : prev);
            } else {
                showError(t(KEYS.common.error), t(KEYS.transactions.verify.error));
            }
        } catch (err: any) {
            const serverMsg: string | undefined = err?.response?.data?.message;
            showError(t(KEYS.common.error), serverMsg ?? t(KEYS.transactions.verify.error));
        } finally {
            setVerifyingId(null);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 className="ptitle">{t(KEYS.transactions.title)}</h1>
                <p className="psub">{t(KEYS.transactions.subtitle)}</p>
            </div>

            {stats && (
                <SimpleGrid cols={{ base: 2, sm: 4 }} mb="lg">
                    <SaleStatCard
                        label={t(KEYS.transactions.stats.totalCount)}
                        value={stats.totalCount.toLocaleString()}
                    />
                    <SaleStatCard
                        label={t(KEYS.transactions.stats.cashTotal)}
                        value={formatPrice(stats.cashTotal)}
                        color="teal"
                    />
                    <SaleStatCard
                        label={t(KEYS.transactions.stats.momoTotal)}
                        value={formatPrice(stats.momoTotal)}
                        color="blue"
                    />
                    <SaleStatCard
                        label={t(KEYS.transactions.stats.pendingTotal)}
                        value={formatPrice(stats.pendingTotal)}
                        color={stats.pendingTotal > 0 ? 'orange' : 'dark'}
                    />
                </SimpleGrid>
            )}

            <SalesFilterBar
                filterFrom={filterFrom}
                filterTo={filterTo}
                filterMethod={filterMethod}
                filterStatus={filterStatus}
                onFromChange={setFilterFrom}
                onToChange={setFilterTo}
                onMethodChange={setFilterMethod}
                onStatusChange={setFilterStatus}
                onApply={handleApply}
                onClear={handleClear}
                hasFilters={hasFilters}
            />

            {loading ? (
                <Center py="xl"><Loader size="sm" /></Center>
            ) : sales.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed" size="sm">{t(KEYS.transactions.empty)}</Text>
                </Center>
            ) : (
                <Stack gap="md">
                    <Table striped highlightOnHover withTableBorder withColumnBorders style={{ fontSize: 13 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{t(KEYS.transactions.table.date)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.saleNumber)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.cashier)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.method)}</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>{t(KEYS.transactions.table.amount)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.status)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.phone)}</Table.Th>
                                <Table.Th>{t(KEYS.transactions.table.reference)}</Table.Th>
                                {canVerify && <Table.Th>{t(KEYS.transactions.table.actions)}</Table.Th>}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {sales.map((sale) => {
                                const isPendingMomo = sale.payment_method === 'momo'
                                    && (sale.payment_status === 'pending' || sale.payment_status === 'failed');

                                return (
                                    <Table.Tr key={sale.id}>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">{formatDateTime(sale.created_at)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600} ff="monospace">{sale.sale_number}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{sale.staff?.name ?? '—'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <SaleMethodLabel method={sale.payment_method} />
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Text size="sm" fw={600}>{formatPrice(Number(sale.amount_due))}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <SaleStatusBadge status={sale.payment_status} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="xs" ff="monospace" c="dimmed">
                                                {sale.customer_phone ?? '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            {sale.paystack_reference ? (
                                                <Text size="xs" ff="monospace" c="dimmed" lineClamp={1} title={sale.paystack_reference}>
                                                    {sale.paystack_reference}
                                                </Text>
                                            ) : (
                                                <Text size="xs" c="dimmed">—</Text>
                                            )}
                                        </Table.Td>
                                        {canVerify && (
                                            <Table.Td>
                                                {isPendingMomo ? (
                                                    <Button
                                                        size="xs"
                                                        color="green"
                                                        variant="light"
                                                        loading={verifyingId === sale.id}
                                                        onClick={() => handleVerify(sale)}
                                                    >
                                                        {t(KEYS.transactions.verify.btn)}
                                                    </Button>
                                                ) : (
                                                    <Text size="xs" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>

                    {totalPages > 1 && (
                        <Group justify="center">
                            <Pagination
                                total={totalPages}
                                value={page}
                                onChange={setPage}
                                color="green"
                                size="sm"
                            />
                        </Group>
                    )}
                </Stack>
            )}
        </div>
    );
};

export default TransactionsPage;
