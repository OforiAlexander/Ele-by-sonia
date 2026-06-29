import React from 'react';
import type { Sale, PosCartItem } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { useCurrency } from '../../hooks/useCurrency';

const PAPER_WIDTHS: Record<string, number> = {
    '58mm': 220,
    '80mm': 302,
};

interface Props {
    sale:               Sale;
    cartItems:          PosCartItem[];
    businessName:       string;
    businessTagline?:   string;
    businessPhone?:     string;
    businessEmail?:     string;
    businessWebsite?:   string;
    registrationNumber?: string;
    graTin?:            string;
    storeAddress?:      string;
    cashierName:        string;
    refundDays:         number;
    footerMessage?:     string;
    footerLine2?:       string;
    paperWidth?:        '58mm' | '80mm';
    showLogo?:          boolean;
    showPhone?:         boolean;
    showEmail?:         boolean;
    showWebsite?:       boolean;
    showCashier?:       boolean;
    showSaleRef?:       boolean;
    showUnitPrices?:    boolean;
    showItemSku?:       boolean;
    showDiscount?:      boolean;
    showLevy?:          boolean;
    showChange?:        boolean;
    showRefundPolicy?:  boolean;
    showTaxBreakdown?:  boolean;
}

const PosReceipt = React.forwardRef<HTMLDivElement, Props>(
    ({
        sale, cartItems,
        businessName, businessTagline, businessPhone, businessEmail, businessWebsite,
        registrationNumber, graTin, storeAddress,
        cashierName, refundDays,
        footerMessage    = 'Thank you for shopping with us!',
        footerLine2      = '',
        paperWidth       = '80mm',
        showLogo         = true,
        showPhone        = true,
        showEmail        = false,
        showWebsite      = false,
        showCashier      = true,
        showSaleRef      = true,
        showUnitPrices   = true,
        showItemSku      = false,
        showDiscount     = true,
        showLevy         = true,
        showChange       = true,
        showRefundPolicy = true,
        showTaxBreakdown = false,
    }, ref) => {
        const { formatPrice } = useCurrency();
        const widthPx = PAPER_WIDTHS[paperWidth] ?? PAPER_WIDTHS['80mm'];

        const date = new Date(sale.created_at).toLocaleString('en-GH', {
            timeZone: 'Africa/Accra',
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        const methodLabel = sale.payment_method === 'momo'
            ? 'Mobile Money'
            : sale.payment_method === 'split' ? 'Split (Cash + Momo)' : 'Cash';

        const subtotal    = cartItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
        const levyAmt     = Number(sale.levy_amount ?? 0);
        const discount    = Number(sale.discount ?? 0);
        const vatAmt      = Number(sale.vat_amount ?? 0);
        const nhilAmt     = Number(sale.nhil_amount ?? 0);
        const getfundAmt  = Number(sale.getfund_amount ?? 0);
        const covidAmt    = Number(sale.covid_levy_amount ?? 0);
        const hasTaxLines = showTaxBreakdown && (vatAmt > 0 || nhilAmt > 0 || getfundAmt > 0 || covidAmt > 0);

        return (
            <div ref={ref} style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 12,
                width: widthPx,
                padding: '12px 8px',
                color: '#000',
                background: '#fff',
            }}>
                {/* ── Header ────────────────────────────────────────────────── */}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    {showLogo && (
                        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 2, marginBottom: 2 }}>✦</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{businessName}</div>
                    {businessTagline && (
                        <div style={{ fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>{businessTagline}</div>
                    )}
                    {registrationNumber && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>Reg: {registrationNumber}</div>
                    )}
                    {graTin && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>TIN: {graTin}</div>
                    )}
                    {storeAddress && (
                        <div style={{ fontSize: 10, marginTop: 4, whiteSpace: 'pre-line' }}>{storeAddress}</div>
                    )}
                    {showPhone && businessPhone && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>Tel: {businessPhone}</div>
                    )}
                    {showEmail && businessEmail && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>{businessEmail}</div>
                    )}
                    {showWebsite && businessWebsite && (
                        <div style={{ fontSize: 10, marginTop: 2 }}>{businessWebsite}</div>
                    )}
                    <div style={{ fontSize: 10, marginTop: 6 }}>SALES RECEIPT</div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{date}</div>
                </div>

                {/* ── Line items ────────────────────────────────────────────── */}
                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10, fontWeight: 600 }}>
                        <span>ITEM</span>
                        <span>TOTAL</span>
                    </div>
                    {cartItems.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ flex: 1, paddingRight: 8, wordBreak: 'break-word' }}>
                                    {item.productName}
                                    {item.variantLabel && item.variantLabel !== item.productName && (
                                        <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>{item.variantLabel}</span>
                                    )}
                                    {showItemSku && item.sku && (
                                        <span style={{ display: 'block', fontSize: 9, opacity: 0.6 }}>SKU: {item.sku}</span>
                                    )}
                                </span>
                                <span style={{ whiteSpace: 'nowrap' }}>{formatPrice(item.price * item.quantity)}</span>
                            </div>
                            {showUnitPrices && (
                                <div style={{ fontSize: 10, opacity: 0.7 }}>
                                    {item.quantity} × {formatPrice(item.price)}
                                    {item.unitPriceOverride !== null && ` (was ${formatPrice(item.originalPrice)})`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Totals ────────────────────────────────────────────────── */}
                <div style={{ marginBottom: 8 }}>
                    <Row label="Subtotal" value={formatPrice(subtotal)} />
                    {showDiscount && discount > 0 && (
                        <Row label="Discount" value={`- ${formatPrice(discount)}`} />
                    )}
                    {showLevy && levyAmt > 0 && (
                        <Row label="Levy" value={formatPrice(levyAmt)} />
                    )}
                    <Row label="TOTAL" value={formatPrice(Number(sale.amount_due))} bold />
                </div>

                {/* ── Ghana tax breakdown (GRA compliance) ─────────────────── */}
                {hasTaxLines && (
                    <div style={{ borderTop: '1px dashed #000', paddingTop: 6, marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
                            {t(KEYS.pos.receipt.taxBreakdown).toUpperCase()}
                        </div>
                        {vatAmt > 0 && (
                            <Row label={t(KEYS.pos.receipt.vat)} value={formatPrice(vatAmt)} />
                        )}
                        {nhilAmt > 0 && (
                            <Row label={t(KEYS.pos.receipt.nhil)} value={formatPrice(nhilAmt)} />
                        )}
                        {getfundAmt > 0 && (
                            <Row label={t(KEYS.pos.receipt.getfund)} value={formatPrice(getfundAmt)} />
                        )}
                        {covidAmt > 0 && (
                            <Row label={t(KEYS.pos.receipt.covidLevy)} value={formatPrice(covidAmt)} />
                        )}
                    </div>
                )}

                {/* ── Payment ───────────────────────────────────────────────── */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: 8, marginBottom: 8 }}>
                    <Row label="Payment" value={methodLabel} />
                    {sale.amount_tendered && (
                        <Row label="Tendered" value={formatPrice(Number(sale.amount_tendered))} />
                    )}
                    {showChange && sale.change_given && Number(sale.change_given) > 0 && (
                        <Row label="Change" value={formatPrice(Number(sale.change_given))} />
                    )}
                    {showSaleRef && <Row label="Ref" value={sale.sale_number} />}
                    {showCashier && <Row label="Served by" value={cashierName} />}
                </div>

                {/* ── Footer ────────────────────────────────────────────────── */}
                <div style={{ textAlign: 'center', fontSize: 10, borderTop: '1px dashed #000', paddingTop: 8 }}>
                    {showRefundPolicy && (
                        <div>Returns accepted within {refundDays} day(s) of purchase.</div>
                    )}
                    <div style={{ marginTop: showRefundPolicy ? 4 : 0 }}>{footerMessage}</div>
                    {footerLine2 && (
                        <div style={{ marginTop: 2 }}>{footerLine2}</div>
                    )}
                </div>
            </div>
        );
    },
);

PosReceipt.displayName = 'PosReceipt';

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontWeight: bold ? 700 : 400 }}>
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

export default PosReceipt;
