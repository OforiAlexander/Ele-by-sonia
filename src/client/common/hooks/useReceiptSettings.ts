import { useMemo } from 'react';
import type { PublicSettings } from '../types';

export interface ReceiptSettings {
    businessName:        string;
    businessTagline:     string;
    businessPhone:       string;
    businessEmail:       string;
    businessWebsite:     string;
    registrationNumber:  string;
    graTin:              string;
    storeAddress:        string;
    footerMessage:       string;
    footerLine2:         string;
    paperWidth:          '58mm' | '80mm';
    refundDays:          number;
    showLogo:            boolean;
    showPhone:           boolean;
    showEmail:           boolean;
    showWebsite:         boolean;
    showCashier:         boolean;
    showSaleRef:         boolean;
    showUnitPrices:      boolean;
    showItemSku:         boolean;
    showDiscount:        boolean;
    showLevy:            boolean;
    showChange:          boolean;
    showRefundPolicy:    boolean;
    showTaxBreakdown:    boolean;
}

export function useReceiptSettings(publicSettings: PublicSettings): ReceiptSettings {
    return useMemo(() => ({
        businessName:       publicSettings['BUSINESS_NAME']                ?? 'Elegance by Sconia',
        businessTagline:    publicSettings['BUSINESS_TAGLINE']             ?? '',
        businessPhone:      publicSettings['BUSINESS_PHONE']               ?? '',
        businessEmail:      publicSettings['BUSINESS_EMAIL']               ?? '',
        businessWebsite:    publicSettings['BUSINESS_WEBSITE']             ?? '',
        registrationNumber: publicSettings['BUSINESS_REGISTRATION_NUMBER'] ?? '',
        graTin:             publicSettings['GRA_TIN']                      ?? '',
        storeAddress:       publicSettings['RECEIPT_STORE_ADDRESS']        ?? '',
        footerMessage:      publicSettings['RECEIPT_FOOTER_MESSAGE']       ?? 'Thank you for shopping with us!',
        footerLine2:        publicSettings['RECEIPT_FOOTER_LINE_2']        ?? '',
        paperWidth:         (publicSettings['RECEIPT_PAPER_WIDTH'] ?? '80mm') as '58mm' | '80mm',
        refundDays:         parseInt(publicSettings['REFUND_VALIDITY_DAYS'] ?? '7', 10),
        showLogo:           publicSettings['RECEIPT_SHOW_LOGO']            !== 'false',
        showPhone:          publicSettings['RECEIPT_SHOW_PHONE']           !== 'false',
        showEmail:          publicSettings['RECEIPT_SHOW_EMAIL']           === 'true',
        showWebsite:        publicSettings['RECEIPT_SHOW_WEBSITE']         === 'true',
        showCashier:        publicSettings['RECEIPT_SHOW_CASHIER']         !== 'false',
        showSaleRef:        publicSettings['RECEIPT_SHOW_SALE_REF']        !== 'false',
        showUnitPrices:     publicSettings['RECEIPT_SHOW_UNIT_PRICES']     !== 'false',
        showItemSku:        publicSettings['RECEIPT_SHOW_ITEM_SKU']        === 'true',
        showDiscount:       publicSettings['RECEIPT_SHOW_DISCOUNT']        !== 'false',
        showLevy:           publicSettings['RECEIPT_SHOW_LEVY']            !== 'false',
        showChange:         publicSettings['RECEIPT_SHOW_CHANGE']          !== 'false',
        showRefundPolicy:   publicSettings['RECEIPT_SHOW_REFUND_POLICY']   !== 'false',
        showTaxBreakdown:   publicSettings['RECEIPT_SHOW_TAX_BREAKDOWN']   === 'true',
    }), [publicSettings]);
}
