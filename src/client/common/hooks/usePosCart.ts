import { useState, useCallback, useEffect } from 'react';
import type { PosCartItem, HeldCart, SearchVariantResult } from '../types';

const HELD_CARTS_KEY  = 'pos_held_carts';
const ACTIVE_CART_KEY = 'pos_active_cart';
const MAX_HOLDS = 3;

interface ActiveCartSnapshot {
    items:          PosCartItem[];
    manualDiscount: number;
}

function loadHeldCarts(): HeldCart[] {
    try { return JSON.parse(localStorage.getItem(HELD_CARTS_KEY) ?? '[]'); }
    catch { return []; }
}

function loadActiveCart(): ActiveCartSnapshot {
    try {
        const raw = localStorage.getItem(ACTIVE_CART_KEY);
        return raw ? JSON.parse(raw) : { items: [], manualDiscount: 0 };
    } catch { return { items: [], manualDiscount: 0 }; }
}

function saveHeldCarts(carts: HeldCart[]): void {
    localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(carts));
}

function clearActiveCart(): void {
    localStorage.removeItem(ACTIVE_CART_KEY);
}

function buildVariantLabel(variant: SearchVariantResult): string {
    if (!variant.optionValues || variant.optionValues.length === 0) return variant.product_name;
    return variant.optionValues.map((v) => v.value).join(' / ');
}

export function usePosCart() {
    const snapshot = loadActiveCart();

    const [items, setItems]                   = useState<PosCartItem[]>(snapshot.items);
    const [manualDiscount, setManualDiscount] = useState<number>(snapshot.manualDiscount);
    const [heldCarts, setHeldCarts]           = useState<HeldCart[]>(loadHeldCarts);

    // Keep active cart in localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(ACTIVE_CART_KEY, JSON.stringify({ items, manualDiscount }));
    }, [items, manualDiscount]);

    const addItem = useCallback((variant: SearchVariantResult) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.variantId === variant.id);
            if (existing) {
                return prev.map((i) =>
                    i.variantId === variant.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i,
                );
            }
            const price = Number(variant.selling_price);
            return [...prev, {
                variantId:         variant.id,
                productName:       variant.product_name,
                variantLabel:      buildVariantLabel(variant),
                sku:               variant.sku,
                originalPrice:     price,
                price,
                quantity:          1,
                unitPriceOverride: null,
            }];
        });
    }, []);

    const updateQuantity = useCallback((variantId: string, qty: number) => {
        if (qty < 1) return;
        setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
    }, []);

    const removeItem = useCallback((variantId: string) => {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    }, []);

    const setOverridePrice = useCallback((variantId: string, override: number | null) => {
        setItems((prev) => prev.map((i) => {
            if (i.variantId !== variantId) return i;
            const price = override !== null ? override : i.originalPrice;
            return { ...i, price, unitPriceOverride: override };
        }));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setManualDiscount(0);
        clearActiveCart();
    }, []);

    const canHold = heldCarts.length < MAX_HOLDS;

    const holdCart = useCallback((label: string): boolean => {
        if (heldCarts.length >= MAX_HOLDS) return false;
        const held: HeldCart = { id: crypto.randomUUID(), label, items, savedAt: Date.now() };
        const updated = [...heldCarts, held];
        setHeldCarts(updated);
        saveHeldCarts(updated);
        clearCart();
        return true;
    }, [heldCarts, items, clearCart]);

    const recallCart = useCallback((id: string) => {
        const held = heldCarts.find((c) => c.id === id);
        if (!held) return;
        setItems(held.items);
        setManualDiscount(0);
        const updated = heldCarts.filter((c) => c.id !== id);
        setHeldCarts(updated);
        saveHeldCarts(updated);
        // active cart localStorage is synced by the useEffect above
    }, [heldCarts]);

    const deleteHeld = useCallback((id: string) => {
        const updated = heldCarts.filter((c) => c.id !== id);
        setHeldCarts(updated);
        saveHeldCarts(updated);
    }, [heldCarts]);

    const subtotal      = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalDiscount = Math.max(0, Math.min(manualDiscount, subtotal));
    const cartTotal     = Math.max(0, subtotal - totalDiscount);

    return {
        items,
        manualDiscount,
        setManualDiscount,
        heldCarts,
        canHold,
        addItem,
        updateQuantity,
        removeItem,
        setOverridePrice,
        clearCart,
        holdCart,
        recallCart,
        deleteHeld,
        subtotal,
        totalDiscount,
        cartTotal,
    };
}
