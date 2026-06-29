import React, { useState, useRef, useCallback } from 'react';
import {
    Group, Text, Button, Badge, ScrollArea,
    NumberInput, Center, Loader, Divider, ActionIcon,
    TextInput, Stack,
} from '@mantine/core';
import { useAuth } from '../../../common/context/AuthContext';
import { usePosCart } from '../../../common/hooks/usePosCart';
import { usePosSearch } from '../../../common/hooks/usePosSearch';
import { usePublicSettings } from '../../../common/hooks/usePublicSettings';
import { useIdleLock } from '../../../common/hooks/useIdleLock';
import { useReceiptSettings } from '../../../common/hooks/useReceiptSettings';
import PosProductCard from '../../../common/components/pos/PosProductCard';
import PosCartItem from '../../../common/components/pos/PosCartItem';
import PosPaymentModal from '../../../common/components/pos/PosPaymentModal';
import PosHoldDrawer from '../../../common/components/pos/PosHoldDrawer';
import PosIdleLockOverlay from '../../../common/components/pos/PosIdleLockOverlay';
import PosCompletedSaleModal from '../../../common/components/pos/PosCompletedSaleModal';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { formatPrice } from '../../../common/utils/formatCurrency';
import { showError, showSuccess, showConfirm } from '../../../common/utils/swal';
import type { Sale, SearchVariantResult, PosCartItem as PosCartItemType } from '../../../common/types';

const HOLD_LABEL_PREFIX = 'Hold';

const PosPage: React.FC = () => {
    const { user, logout } = useAuth();

    const canProcess  = user?.is_owner || !!user?.can_process_sales;
    const canDiscount = user?.is_owner || !!user?.can_discount_sales;

    const {
        items, manualDiscount, setManualDiscount,
        heldCarts, canHold,
        addItem, updateQuantity, removeItem, setOverridePrice,
        clearCart, holdCart, recallCart, deleteHeld,
        subtotal, totalDiscount, cartTotal,
    } = usePosCart();

    const { query, setQuery, results, loading: searching } = usePosSearch();

    const publicSettings  = usePublicSettings();
    const receiptSettings = useReceiptSettings(publicSettings);

    const [paymentOpen, setPaymentOpen]     = useState(false);
    const [holdOpen, setHoldOpen]           = useState(false);
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [saleCartItems, setSaleCartItems] = useState<PosCartItemType[]>([]);
    const [posLocked, setPosLocked]         = useState(false);

    const searchRef   = useRef<HTMLInputElement>(null);
    const idleMinutes = parseInt(publicSettings['POS_IDLE_LOCK_MINUTES'] ?? '0', 10);
    useIdleLock(idleMinutes, () => setPosLocked(true));

    const allowOverride = publicSettings['ALLOW_PRICE_OVERRIDE'] !== 'false';
    const canOverride   = allowOverride && (user?.is_owner || !!user?.can_override_price);
    const cashierName   = user?.name ?? '';

    const handleSelectVariant = useCallback((variant: SearchVariantResult) => {
        addItem(variant);
        searchRef.current?.focus();
    }, [addItem]);

    const handleHold = async () => {
        if (items.length === 0) return;
        if (!canHold) {
            showError(t(KEYS.common.error), t(KEYS.pos.hold.maxReached));
            return;
        }
        holdCart(`${HOLD_LABEL_PREFIX} ${heldCarts.length + 1}`);
        showSuccess(t(KEYS.pos.toast.held), '');
    };

    const handleClear = async () => {
        if (items.length === 0) return;
        const result = await showConfirm(t(KEYS.pos.cart.clearTitle), t(KEYS.pos.cart.clearBody));
        if (result.isConfirmed) clearCart();
    };

    const handlePaymentComplete = (sale: Sale) => {
        setSaleCartItems([...items]);
        setPaymentOpen(false);
        setCompletedSale(sale);
        clearCart();
    };

    if (!canProcess) {
        return (
            <Center style={{ height: '60vh' }}>
                <Text c="dimmed">{t(KEYS.pos.noPermission)}</Text>
            </Center>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 116px)', overflow: 'hidden' }}>

            {/* ── Left panel: search + product grid ─────────────────────── */}
            <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ marginBottom: 14 }}>
                    <h1 className="ptitle">{t(KEYS.pos.title)}</h1>
                    <p className="psub">{t(KEYS.pos.subtitle)}</p>
                </div>

                <TextInput
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    placeholder={t(KEYS.pos.searchPlaceholder)}
                    size="md"
                    mb="sm"
                    leftSection={
                        searching
                            ? <Loader size="xs" />
                            : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                            )
                    }
                    rightSection={query.length > 0 && (
                        <ActionIcon variant="subtle" color="gray" onClick={() => setQuery('')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </ActionIcon>
                    )}
                />

                {query.length === 1 && (
                    <Text size="xs" c="dimmed" mb="xs">{t(KEYS.pos.searchHint)}</Text>
                )}

                <ScrollArea style={{ flex: 1 }}>
                    {searching && results.length === 0 ? (
                        <Center py="xl"><Loader size="sm" /></Center>
                    ) : results.length === 0 ? (
                        <Center py="xl">
                            <Text size="sm" c="dimmed">{t(KEYS.pos.searchEmpty)}</Text>
                        </Center>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: 10,
                            paddingBottom: 16,
                        }}>
                            {results.map((variant) => (
                                <PosProductCard
                                    key={variant.id}
                                    variant={variant}
                                    onClick={() => handleSelectVariant(variant)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* ── Right panel: cart ─────────────────────────────────────── */}
            <div style={{
                flex: '0 0 45%',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                border: '1px solid #ECEFEC',
                borderRadius: 14,
                overflow: 'hidden',
            }}>
                {/* Cart header */}
                <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #ECEFEC', flexShrink: 0 }}>
                    <Group gap={8}>
                        <Text fw={600}>{t(KEYS.pos.cart.title)}</Text>
                        {items.length > 0 && (
                            <Badge color="green" size="sm" circle>{items.length}</Badge>
                        )}
                    </Group>
                    <Group gap={6}>
                        <Button
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={() => setHoldOpen(true)}
                            disabled={heldCarts.length === 0 && items.length === 0}
                        >
                            {t(KEYS.pos.cart.heldLabel)}
                            {heldCarts.length > 0 && (
                                <Badge size="xs" color="orange" ml={4}>{heldCarts.length}</Badge>
                            )}
                        </Button>
                    </Group>
                </Group>

                {/* Cart items */}
                <ScrollArea style={{ flex: 1 }} px="md">
                    {items.length === 0 ? (
                        <Center py="xl">
                            <Text size="sm" c="dimmed">{t(KEYS.pos.cart.empty)}</Text>
                        </Center>
                    ) : (
                        items.map((item) => (
                            <PosCartItem
                                key={item.variantId}
                                item={item}
                                canOverride={canOverride}
                                onUpdateQty={updateQuantity}
                                onRemove={removeItem}
                                onSetOverride={setOverridePrice}
                            />
                        ))
                    )}
                </ScrollArea>

                {/* Cart footer */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #ECEFEC', flexShrink: 0 }}>
                    {canDiscount && items.length > 0 && (
                        <NumberInput
                            label={t(KEYS.pos.discountLabel)}
                            placeholder={t(KEYS.pos.discountPlaceholder)}
                            size="xs"
                            prefix="₵"
                            min={0}
                            max={subtotal}
                            decimalScale={2}
                            fixedDecimalScale
                            value={manualDiscount}
                            onChange={(v) => setManualDiscount(typeof v === 'number' ? v : 0)}
                            mb="sm"
                            hideControls
                        />
                    )}

                    <Stack gap={4} mb="sm">
                        {items.length > 0 && (
                            <>
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">{t(KEYS.pos.cart.subtotal)}</Text>
                                    <Text size="sm">{formatPrice(subtotal)}</Text>
                                </Group>
                                {totalDiscount > 0 && (
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">{t(KEYS.pos.cart.discount)}</Text>
                                        <Text size="sm" c="red">- {formatPrice(totalDiscount)}</Text>
                                    </Group>
                                )}
                                <Divider />
                                <Group justify="space-between">
                                    <Text fw={700}>{t(KEYS.pos.cart.total)}</Text>
                                    <Text fw={800} size="lg">{formatPrice(cartTotal)}</Text>
                                </Group>
                            </>
                        )}
                    </Stack>

                    <Group gap={8}>
                        {items.length > 0 && (
                            <>
                                <Button
                                    size="sm"
                                    variant="light"
                                    color="gray"
                                    onClick={handleHold}
                                    disabled={!canHold}
                                    style={{ flex: 1 }}
                                >
                                    {t(KEYS.pos.cart.hold)}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    color="red"
                                    onClick={handleClear}
                                    style={{ flex: 1 }}
                                >
                                    {t(KEYS.pos.cart.clear)}
                                </Button>
                            </>
                        )}
                        <Button
                            size="sm"
                            color="green"
                            onClick={() => setPaymentOpen(true)}
                            disabled={items.length === 0}
                            style={{ flex: 2 }}
                        >
                            {t(KEYS.pos.cart.checkout)}
                        </Button>
                    </Group>
                </div>
            </div>

            {/* ── Modals / drawers ──────────────────────────────────────── */}
            <PosPaymentModal
                opened={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                cartItems={items}
                manualDiscount={manualDiscount}
                cartTotal={cartTotal}
                canDiscount={canDiscount}
                publicSettings={publicSettings}
                onComplete={handlePaymentComplete}
            />

            <PosHoldDrawer
                opened={holdOpen}
                onClose={() => setHoldOpen(false)}
                heldCarts={heldCarts}
                hasActiveCart={items.length > 0}
                onRecall={recallCart}
                onDelete={deleteHeld}
            />

            <PosIdleLockOverlay
                opened={posLocked}
                onUnlock={() => logout().catch(() => undefined)}
            />

            <PosCompletedSaleModal
                sale={completedSale}
                cartItems={saleCartItems}
                receiptSettings={receiptSettings}
                cashierName={cashierName}
                onClose={() => setCompletedSale(null)}
            />
        </div>
    );
};

export default PosPage;
