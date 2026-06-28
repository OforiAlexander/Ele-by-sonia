import React from 'react';
import type { Sale, PosCartItem } from '../../types';
import { formatPrice } from '../../utils/formatCurrency';

interface Props {
    sale:         Sale;
    cartItems:    PosCartItem[];
    businessName: string;
    cashierName:  string;
    refundDays:   number;
}

const PosReceipt = React.forwardRef<HTMLDivElement, Props>(
    ({ sale, cartItems, businessName, cashierName, refundDays }, ref) => {
        const date = new Date(sale.created_at).toLocaleString('en-GH', {
            timeZone: 'Africa/Accra',
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        const methodLabel = sale.payment_method === 'momo' ? 'Mobile Money' : 'Cash';

        const subtotal = cartItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);

        return (
            <div ref={ref} style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 12,
                width: 280,
                padding: '12px 8px',
                color: '#000',
                background: '#fff',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{businessName}</div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>SALES RECEIPT</div>
                    <div style={{ fontSize: 10, marginTop: 2 }}>{date}</div>
                </div>

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
                                </span>
                                <span style={{ whiteSpace: 'nowrap' }}>{formatPrice(item.price * item.quantity)}</span>
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.7 }}>
                                {item.quantity} × {formatPrice(item.price)}
                                {item.unitPriceOverride !== null && ` (was ${formatPrice(item.originalPrice)})`}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 8 }}>
                    <Row label="Subtotal" value={formatPrice(subtotal)} />
                    {Number(sale.discount) > 0 && (
                        <Row label="Discount" value={`- ${formatPrice(Number(sale.discount))}`} />
                    )}
                    <Row label="TOTAL" value={formatPrice(Number(sale.amount_due))} bold />
                </div>

                <div style={{ borderTop: '1px dashed #000', paddingTop: 8, marginBottom: 8 }}>
                    <Row label="Payment" value={methodLabel} />
                    {sale.amount_tendered && (
                        <Row label="Tendered" value={formatPrice(Number(sale.amount_tendered))} />
                    )}
                    {sale.change_given && Number(sale.change_given) > 0 && (
                        <Row label="Change" value={formatPrice(Number(sale.change_given))} />
                    )}
                    <Row label="Ref" value={sale.sale_number} />
                    <Row label="Served by" value={cashierName} />
                </div>

                <div style={{ textAlign: 'center', fontSize: 10, borderTop: '1px dashed #000', paddingTop: 8 }}>
                    <div>Returns accepted within {refundDays} day(s) of purchase.</div>
                    <div style={{ marginTop: 4 }}>Thank you for shopping with us!</div>
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
