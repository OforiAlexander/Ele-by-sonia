import React, { useState, useRef, useCallback } from 'react';
import {
    Stack, Group, Text, Button, Badge, ScrollArea,
    NumberInput, Center, Loader, Divider, ActionIcon,
    TextInput,
} from '@mantine/core';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../../common/context/AuthContext';
import { usePosCart } from '../../../common/hooks/usePosCart';
import { usePosSearch } from '../../../common/hooks/usePosSearch';
import PosCartItem from '../../../common/components/pos/PosCartItem';
import PosPaymentModal from '../../../common/components/pos/PosPaymentModal';
import PosHoldDrawer from '../../../common/components/pos/PosHoldDrawer';
import PosReceipt from '../../../common/components/pos/PosReceipt';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { formatPrice } from '../../../common/utils/formatCurrency';
import { showError, showSuccess, showConfirm } from '../../../common/utils/swal';
import type { Sale, SearchVariantResult, PosCartItem as PosCartItemType } from '../../../common/types';

const HOLD_CART_LABEL_PREFIX = 'Hold';

const PosPage: React.FC = () => {
    const { user } = useAuth();

    const canProcess  = user?.is_owner || !!user?.can_process_sales;
    const canDiscount = user?.is_owner || !!user?.can_discount_sales;
    const canOverride = user?.is_owner || !!user?.can_override_price;

    const {
        items, manualDiscount, setManualDiscount,
        heldCarts, canHold,
        addItem, updateQuantity, removeItem, setOverridePrice,
        clearCart, holdCart, recallCart, deleteHeld,
        subtotal, totalDiscount, cartTotal,
    } = usePosCart();

    const { query, setQuery, results, loading: searching } = usePosSearch();

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [holdOpen, setHoldOpen]       = useState(false);
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [receiptCartItems, setReceiptCartItems] = useState<PosCartItemType[]>([]);

    const receiptRef = useRef<HTMLDivElement>(null);
    const searchRef  = useRef<HTMLInputElement>(null);

    const handlePrint = useReactToPrint({ contentRef: receiptRef });

    const handleSelectVariant = useCallback((variant: SearchVariantResult) => {
        if (variant.stock <= 0) {
            showError(t(KEYS.pos.outOfStock), `${variant.product_name} has no stock available.`);
            return;
        }
        addItem(variant);
        searchRef.current?.focus();
    }, [addItem]);

    const handleHold = async () => {
        if (items.length === 0) return;
        if (!canHold) {
            showError(t(KEYS.common.error), t(KEYS.pos.hold.maxReached));
            return;
        }
        const label = `${HOLD_CART_LABEL_PREFIX} ${heldCarts.length + 1}`;
        holdCart(label);
        showSuccess(t(KEYS.pos.toast.held), '');
    };

    const handleClear = async () => {
        if (items.length === 0) return;
        const ok = await showConfirm('Clear cart?', 'All items will be removed.');
        if (ok.isConfirmed) clearCart();
    };

    const handlePaymentComplete = (sale: Sale) => {
        setReceiptCartItems([...items]);
        setPaymentOpen(false);
        setCompletedSale(sale);
        clearCart();
    };

    const handleCloseSale = () => {
        setCompletedSale(null);
    };

    if (!canProcess) {
        return (
            <Center style={{ height: '60vh' }}>
                <Text c="dimmed">{t(KEYS.pos.noPermission)}</Text>
            </Center>
        );
    }

    const businessName  = 'Elegance by Sconia';
    const cashierName   = user?.name ?? '';
    const refundDays    = 7;

    return (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 116px)', overflow: 'hidden' }}>
            {/* ── Left panel: search + product grid ───────────────────── */}
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
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    }
                    rightSection={query.length > 0 && (
                        <ActionIcon variant="subtle" color="gray" onClick={() => setQuery('')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                                <ProductCard
                                    key={variant.id}
                                    variant={variant}
                                    onClick={() => handleSelectVariant(variant)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* ── Right panel: cart ────────────────────────────────────── */}
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
                    {/* Discount input */}
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

                    {/* Totals */}
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

                    {/* Action buttons */}
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

            {/* ── Modals / drawers ─────────────────────────────────────── */}
            <PosPaymentModal
                opened={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                cartItems={items}
                manualDiscount={manualDiscount}
                cartTotal={cartTotal}
                canDiscount={canDiscount}
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

            {/* ── Completed sale receipt ───────────────────────────────── */}
            {completedSale && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
                    }}
                >
                    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxWidth: 360, width: '100%' }}>
                        <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #ECEFEC' }}>
                            <Text fw={600}>{t(KEYS.pos.receipt.title)}</Text>
                            <Group gap={8}>
                                <Button size="xs" variant="light" color="green" onClick={() => handlePrint()}>
                                    {t(KEYS.pos.receipt.print)}
                                </Button>
                                <Button size="xs" color="green" onClick={handleCloseSale}>
                                    {t(KEYS.pos.receipt.close)}
                                </Button>
                            </Group>
                        </Group>
                        <div style={{ padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
                            <PosReceipt
                                ref={receiptRef}
                                sale={completedSale}
                                cartItems={receiptCartItems}
                                businessName={businessName}
                                cashierName={cashierName}
                                refundDays={refundDays}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductCard: React.FC<{ variant: SearchVariantResult; onClick: () => void }> = ({ variant, onClick }) => {
    const opts = variant.optionValues?.map((v) => v.value).join(' / ');
    const outOfStock = variant.stock <= 0;

    return (
        <div
            onClick={outOfStock ? undefined : onClick}
            style={{
                border: '1px solid #ECEFEC',
                borderRadius: 10,
                padding: '12px 10px',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                opacity: outOfStock ? 0.55 : 1,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'box-shadow 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
                if (!outOfStock) {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.10)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#2d9e52';
                }
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.borderColor = '#ECEFEC';
            }}
        >
            <Text size="sm" fw={700} lineClamp={2} style={{ lineHeight: 1.3 }}>{variant.product_name}</Text>
            {opts && <Text size="xs" c="dimmed" lineClamp={1}>{opts}</Text>}
            {variant.sku && <Badge size="xs" variant="outline" color="gray" style={{ alignSelf: 'flex-start' }}>{variant.sku}</Badge>}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text size="sm" fw={800} c="green">{formatPrice(Number(variant.selling_price))}</Text>
                {outOfStock ? (
                    <Badge size="xs" color="red">{t(KEYS.pos.outOfStock)}</Badge>
                ) : (
                    <Text size="xs" c="dimmed">{variant.stock} left</Text>
                )}
            </div>
        </div>
    );
};

export default PosPage;
