import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Modal, Stack, Group, Button, Text, Tabs, NumberInput,
    TextInput, Badge, Loader, Center,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import api from '../../api';
import type { PosCartItem, Sale } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { formatPrice } from '../../utils/formatCurrency';
import { showError } from '../../utils/swal';

type MomoProvider = 'mtn' | 'vod' | 'atl';
type ModalStep = 'select' | 'submitting' | 'momo_pending' | 'done';

interface Props {
    opened:         boolean;
    onClose:        () => void;
    cartItems:      PosCartItem[];
    manualDiscount: number;
    cartTotal:      number;
    canDiscount:    boolean;
    onComplete:     (sale: Sale) => void;
}

function detectProvider(phone: string): MomoProvider | null {
    const clean = phone.replace(/[\s\-()]/g, '');
    let norm = clean;
    if (norm.startsWith('+233')) norm = '0' + norm.slice(4);
    else if (norm.startsWith('233')) norm = '0' + norm.slice(3);
    if (['024','054','055','059','025'].some((p) => norm.startsWith(p))) return 'mtn';
    if (['020','050'].some((p) => norm.startsWith(p))) return 'vod';
    if (['026','056','027','057'].some((p) => norm.startsWith(p))) return 'atl';
    return null;
}

function providerLabel(p: MomoProvider | null): string {
    if (p === 'mtn') return t(KEYS.pos.payment.mtn);
    if (p === 'vod') return t(KEYS.pos.payment.vod);
    if (p === 'atl') return t(KEYS.pos.payment.atl);
    return t(KEYS.pos.payment.unknownNetwork);
}

function providerColor(p: MomoProvider | null): string {
    if (p === 'mtn') return 'yellow';
    if (p === 'vod') return 'red';
    if (p === 'atl') return 'blue';
    return 'gray';
}

const PosPaymentModal: React.FC<Props> = ({
    opened, onClose, cartItems, manualDiscount, cartTotal, canDiscount, onComplete,
}) => {
    const [tab, setTab]   = useState<string>('cash');
    const [step, setStep] = useState<ModalStep>('select');
    const [pendingSale, setPendingSale]     = useState<Sale | null>(null);
    const [detectedProvider, setDetected]   = useState<MomoProvider | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!opened) {
            setTab('cash');
            setStep('select');
            setPendingSale(null);
            setDetected(null);
            if (pollRef.current) clearInterval(pollRef.current);
        }
    }, [opened]);

    useEffect(() => {
        if (step !== 'momo_pending' || !pendingSale) return;

        pollRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/sales/${pendingSale.id}`);
                const sale: Sale = res.data.data;
                if (sale.payment_status === 'paid') {
                    clearInterval(pollRef.current!);
                    setStep('done');
                    setPendingSale(sale);
                } else if (sale.payment_status === 'failed') {
                    clearInterval(pollRef.current!);
                    setStep('select');
                    showError(t(KEYS.pos.payment.failed), t(KEYS.pos.payment.failedHint));
                }
            } catch { /* network blip — keep polling */ }
        }, 3000);

        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [step, pendingSale]);

    const cashSchema = useMemo(() => Yup.object({
        amount_tendered: Yup.number()
            .required(t(KEYS.pos.validation.tenderRequired))
            .min(cartTotal, t(KEYS.pos.validation.tenderMin)),
    }), [cartTotal]);

    const momoSchema = Yup.object({
        customer_phone: Yup.string()
            .required(t(KEYS.pos.validation.phoneRequired))
            .min(10, t(KEYS.pos.validation.phoneMin)),
    });

    const buildItems = () => cartItems.map((i) => ({
        variant_id: i.variantId,
        quantity:   i.quantity,
        ...(i.unitPriceOverride !== null ? { unit_price_override: i.unitPriceOverride } : {}),
    }));

    const handleSaleError = (err: any) => {
        setStep('select');
        const code: string | undefined = err?.response?.data?.code;
        const serverMessage: string | undefined = err?.response?.data?.message;
        const SURFACED_CODES = new Set(['STOCK_INSUFFICIENT', 'VARIANT_INACTIVE', 'AMOUNT_INSUFFICIENT', 'FORBIDDEN']);
        if (code && SURFACED_CODES.has(code) && serverMessage) {
            showError(t(KEYS.common.error), serverMessage);
        } else {
            showError(t(KEYS.common.error), t(KEYS.pos.toast.saleError));
        }
    };

    const submitCash = async (values: { amount_tendered: number }) => {
        setStep('submitting');
        try {
            const res = await api.post('/sales', {
                payment_method:  'cash',
                amount_tendered: values.amount_tendered,
                discount:        canDiscount ? manualDiscount : 0,
                items:           buildItems(),
            });
            const sale: Sale = res.data.data;
            setPendingSale(sale);
            setStep('done');
        } catch (err: any) {
            handleSaleError(err);
        }
    };

    const submitMomo = async (values: { customer_phone: string }) => {
        const provider = detectProvider(values.customer_phone);
        if (!provider) {
            showError(t(KEYS.common.error), t(KEYS.pos.validation.phoneMin));
            return;
        }
        setStep('submitting');
        try {
            const res = await api.post('/sales', {
                payment_method: 'momo',
                customer_phone: values.customer_phone,
                momo_provider:  provider,
                discount:       canDiscount ? manualDiscount : 0,
                items:          buildItems(),
            });
            const sale: Sale = res.data.data;
            setPendingSale(sale);
            setStep('momo_pending');
        } catch (err: any) {
            handleSaleError(err);
        }
    };

    const handleDone = () => {
        if (pendingSale) onComplete(pendingSale);
    };

    if (step === 'submitting') {
        return (
            <Modal opened={opened} onClose={() => {}} withCloseButton={false} centered size="sm">
                <Center py="xl"><Loader size="md" /></Center>
            </Modal>
        );
    }

    if (step === 'momo_pending') {
        return (
            <Modal opened={opened} onClose={() => {}} withCloseButton={false} centered size="sm" title={t(KEYS.pos.payment.pending)}>
                <Stack align="center" gap="md" py="md">
                    <Loader size="lg" color="yellow" />
                    <Text size="sm" ta="center" c="dimmed">{t(KEYS.pos.payment.pendingHint)}</Text>
                    <Text fw={700} size="xl">{formatPrice(cartTotal)}</Text>
                    <Text size="xs" c="dimmed">{pendingSale?.sale_number}</Text>
                </Stack>
            </Modal>
        );
    }

    if (step === 'done' && pendingSale) {
        return (
            <Modal
                opened={opened}
                onClose={handleDone}
                centered
                size="sm"
                title={t(KEYS.pos.receipt.title)}
                withCloseButton={false}
            >
                <Stack gap="md" align="center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d9e52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/>
                    </svg>
                    <Text fw={700} size="lg">{formatPrice(Number(pendingSale.amount_due))}</Text>
                    <Text size="sm" c="dimmed">{pendingSale.sale_number}</Text>
                    {pendingSale.change_given && Number(pendingSale.change_given) > 0 && (
                        <Text size="sm">
                            {t(KEYS.pos.receipt.change)}: <b>{formatPrice(Number(pendingSale.change_given))}</b>
                        </Text>
                    )}
                </Stack>
                <Group justify="center" mt="lg">
                    <Button color="green" onClick={handleDone}>{t(KEYS.pos.receipt.close)}</Button>
                </Group>
            </Modal>
        );
    }

    return (
        <Modal opened={opened} onClose={onClose} centered size="md" title={t(KEYS.pos.payment.title)}>
            <Stack gap="md">
                <Group justify="space-between" p="xs" style={{ background: '#f8f9f5', borderRadius: 8 }}>
                    <Text size="sm" c="dimmed">{t(KEYS.pos.payment.amountDue)}</Text>
                    <Text size="xl" fw={800}>{formatPrice(cartTotal)}</Text>
                </Group>

                <Tabs value={tab} onChange={(v) => setTab(v ?? 'cash')}>
                    <Tabs.List>
                        <Tabs.Tab value="cash">{t(KEYS.pos.payment.cash)}</Tabs.Tab>
                        <Tabs.Tab value="momo">{t(KEYS.pos.payment.momo)}</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="cash" pt="md">
                        <Formik
                            initialValues={{ amount_tendered: cartTotal }}
                            validationSchema={cashSchema}
                            onSubmit={(v) => submitCash(v)}
                        >
                            {({ values, errors, touched, setFieldValue, isSubmitting }) => {
                                const change = Math.max(0, (values.amount_tendered ?? 0) - cartTotal);
                                return (
                                    <Form>
                                        <Stack gap="md">
                                            <Field name="amount_tendered">
                                                {({ field }: FieldProps) => (
                                                    <NumberInput
                                                        label={t(KEYS.pos.payment.amountTendered)}
                                                        prefix="₵"
                                                        min={0}
                                                        decimalScale={2}
                                                        fixedDecimalScale
                                                        value={field.value}
                                                        onChange={(v) => setFieldValue('amount_tendered', v)}
                                                        error={touched.amount_tendered && errors.amount_tendered}
                                                        autoFocus
                                                    />
                                                )}
                                            </Field>
                                            <Group justify="space-between" style={{ background: '#f0faf4', borderRadius: 8, padding: '10px 14px' }}>
                                                <Text size="sm">{t(KEYS.pos.payment.change)}</Text>
                                                <Text fw={700} c="green">{formatPrice(change)}</Text>
                                            </Group>
                                            <Group justify="flex-end">
                                                <Button variant="subtle" color="gray" onClick={onClose}>{t(KEYS.pos.payment.cancel)}</Button>
                                                <Button type="submit" color="green" loading={isSubmitting}>{t(KEYS.pos.payment.confirm)}</Button>
                                            </Group>
                                        </Stack>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </Tabs.Panel>

                    <Tabs.Panel value="momo" pt="md">
                        <Formik
                            initialValues={{ customer_phone: '' }}
                            validationSchema={momoSchema}
                            onSubmit={(v) => submitMomo(v)}
                        >
                            {({ values, errors, touched, isSubmitting }) => {
                                const provider = detectProvider(values.customer_phone);
                                return (
                                    <Form>
                                        <Stack gap="md">
                                            <Field name="customer_phone">
                                                {({ field }: FieldProps) => (
                                                    <TextInput
                                                        {...field}
                                                        label={t(KEYS.pos.payment.phone)}
                                                        placeholder={t(KEYS.pos.payment.phonePlaceholder)}
                                                        error={touched.customer_phone && errors.customer_phone}
                                                        autoFocus
                                                        rightSection={
                                                            values.customer_phone.length >= 10 ? (
                                                                <Badge size="sm" color={providerColor(provider)}>
                                                                    {providerLabel(provider)}
                                                                </Badge>
                                                            ) : undefined
                                                        }
                                                        rightSectionWidth={100}
                                                    />
                                                )}
                                            </Field>
                                            <Text size="xs" c="dimmed">
                                                {t(KEYS.pos.payment.pendingHint)}
                                            </Text>
                                            <Group justify="flex-end">
                                                <Button variant="subtle" color="gray" onClick={onClose}>{t(KEYS.pos.payment.cancel)}</Button>
                                                <Button type="submit" color="yellow" loading={isSubmitting}>{t(KEYS.pos.payment.confirm)}</Button>
                                            </Group>
                                        </Stack>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Modal>
    );
};

export default PosPaymentModal;
