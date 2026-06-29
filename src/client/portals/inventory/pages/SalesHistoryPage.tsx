import React, { useState, useCallback } from 'react';
import {
    Group, Text, Button, Table, Pagination,
    Stack, Loader, Center,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import api from '../../../common/api';
import { useAuth } from '../../../common/context/AuthContext';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { formatPrice } from '../../../common/utils/formatCurrency';
import { formatDateTime, toLocalDate } from '../../../common/utils/dateUtils';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import SaleStatusBadge from '../../../common/components/sales/SaleStatusBadge';
import SaleMethodLabel from '../../../common/components/sales/SaleMethodLabel';
import SalesFilterBar from '../../../common/components/sales/SalesFilterBar';
import SaleDetailDrawer from '../../../common/components/sales/SaleDetailDrawer';
import type { Sale } from '../../../common/types';

const PAGE_SIZE = 20;

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
    const hasFilters = !!(filterFrom || filterTo || filterMethod);

    const fetchSales = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page:           p,
                limit:          PAGE_SIZE,
                include_voided: 'true',
            };
            if (filterFrom)   params.from           = toLocalDate(filterFrom);
            if (filterTo)     params.to             = toLocalDate(filterTo);
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

    const handleApply = () => { setPage(1); fetchSales(1); };

    const handleClear = () => {
        setFilterFrom(null);
        setFilterTo(null);
        setFilterMethod(null);
        setPage(1);
    };

    const openDetail = async (sale: Sale) => {
        setDetailSale(sale);
        setDetailLoading(true);
        try {
            const res = await api.get(`/sales/${sale.id}`);
            setDetailSale(res.data.data);
        } catch {
            // keep list-level data if detail load fails
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

            <SalesFilterBar
                filterFrom={filterFrom}
                filterTo={filterTo}
                filterMethod={filterMethod}
                onFromChange={setFilterFrom}
                onToChange={setFilterTo}
                onMethodChange={setFilterMethod}
                onApply={handleApply}
                onClear={handleClear}
                hasFilters={hasFilters}
            />

            {loading ? (
                <Center py="xl"><Loader size="sm" /></Center>
            ) : sales.length === 0 ? (
                <Center py="xl">
                    <Text c="dimmed" size="sm">{t(KEYS.salesHistory.empty)}</Text>
                </Center>
            ) : (
                <Stack gap="md">
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
                                <Table.Tr key={sale.id} style={{ opacity: sale.voided_at ? 0.6 : 1 }}>
                                    <Table.Td>
                                        <Text size="sm" fw={600} ff="monospace">{sale.sale_number}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{formatDateTime(sale.created_at)}</Text>
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
                                        <SaleStatusBadge status={sale.payment_status} voided={!!sale.voided_at} />
                                    </Table.Td>
                                    <Table.Td>
                                        <Button size="xs" variant="subtle" color="green" onClick={() => openDetail(sale)}>
                                            {t(KEYS.common.viewBtn)}
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
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

            <SaleDetailDrawer
                sale={detailSale}
                loading={detailLoading}
                canVoid={canVoid}
                voiding={voiding}
                onClose={() => setDetailSale(null)}
                onVoid={handleVoid}
            />
        </div>
    );
};

export default SalesHistoryPage;
