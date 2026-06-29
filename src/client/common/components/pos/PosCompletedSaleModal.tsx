import React, { useRef } from 'react';
import { Modal, Group, Button, Text, ScrollArea } from '@mantine/core';
import { useReactToPrint } from 'react-to-print';
import PosReceipt from './PosReceipt';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { Sale, PosCartItem } from '../../types';
import type { ReceiptSettings } from '../../hooks/useReceiptSettings';

interface Props {
    sale:            Sale | null;
    cartItems:       PosCartItem[];
    receiptSettings: ReceiptSettings;
    cashierName:     string;
    onClose:         () => void;
}

const PosCompletedSaleModal: React.FC<Props> = ({ sale, cartItems, receiptSettings, cashierName, onClose }) => {
    const receiptRef  = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({ contentRef: receiptRef });

    return (
        <Modal
            opened={!!sale}
            onClose={onClose}
            withCloseButton={false}
            centered
            size="sm"
            padding={0}
            styles={{ body: { padding: 0 } }}
        >
            {sale && (
                <>
                    <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #ECEFEC' }}>
                        <Text fw={600}>{t(KEYS.pos.receipt.title)}</Text>
                        <Group gap={8}>
                            <Button size="xs" variant="light" color="green" onClick={() => handlePrint()}>
                                {t(KEYS.pos.receipt.print)}
                            </Button>
                            <Button size="xs" color="green" onClick={onClose}>
                                {t(KEYS.pos.receipt.close)}
                            </Button>
                        </Group>
                    </Group>
                    <ScrollArea mah="70vh" p="md">
                        <PosReceipt
                            ref={receiptRef}
                            sale={sale}
                            cartItems={cartItems}
                            businessName={receiptSettings.businessName}
                            businessTagline={receiptSettings.businessTagline}
                            businessPhone={receiptSettings.businessPhone}
                            businessEmail={receiptSettings.businessEmail}
                            businessWebsite={receiptSettings.businessWebsite}
                            registrationNumber={receiptSettings.registrationNumber}
                            graTin={receiptSettings.graTin}
                            storeAddress={receiptSettings.storeAddress}
                            cashierName={cashierName}
                            refundDays={receiptSettings.refundDays}
                            footerMessage={receiptSettings.footerMessage}
                            footerLine2={receiptSettings.footerLine2}
                            paperWidth={receiptSettings.paperWidth}
                            showLogo={receiptSettings.showLogo}
                            showPhone={receiptSettings.showPhone}
                            showEmail={receiptSettings.showEmail}
                            showWebsite={receiptSettings.showWebsite}
                            showCashier={receiptSettings.showCashier}
                            showSaleRef={receiptSettings.showSaleRef}
                            showUnitPrices={receiptSettings.showUnitPrices}
                            showItemSku={receiptSettings.showItemSku}
                            showDiscount={receiptSettings.showDiscount}
                            showLevy={receiptSettings.showLevy}
                            showChange={receiptSettings.showChange}
                            showRefundPolicy={receiptSettings.showRefundPolicy}
                            showTaxBreakdown={receiptSettings.showTaxBreakdown}
                        />
                    </ScrollArea>
                </>
            )}
        </Modal>
    );
};

export default PosCompletedSaleModal;
