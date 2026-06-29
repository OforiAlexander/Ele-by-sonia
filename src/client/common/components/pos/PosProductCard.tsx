import React, { useState, memo } from 'react';
import { Text, Badge } from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { useCurrency } from '../../hooks/useCurrency';
import { showError } from '../../utils/swal';
import type { SearchVariantResult } from '../../types';

interface Props {
    variant: SearchVariantResult;
    onClick: () => void;
}

const PosProductCard: React.FC<Props> = memo(({ variant, onClick }) => {
    const { formatPrice } = useCurrency();
    const [hovered, setHovered] = useState(false);
    const opts = variant.optionValues?.map((v) => v.value).join(' / ');
    const outOfStock = variant.stock <= 0;

    const handleClick = () => {
        if (outOfStock) {
            showError(t(KEYS.pos.outOfStock), t(KEYS.pos.outOfStockDetail));
            return;
        }
        onClick();
    };

    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => !outOfStock && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: `1px solid ${hovered ? '#2d9e52' : '#ECEFEC'}`,
                borderRadius: 10,
                padding: '12px 10px',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                opacity: outOfStock ? 0.55 : 1,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: hovered ? '0 2px 10px rgba(0,0,0,0.10)' : 'none',
                transition: 'box-shadow 0.12s, border-color 0.12s',
            }}
        >
            <Text size="sm" fw={700} lineClamp={2} style={{ lineHeight: 1.3 }}>
                {variant.product_name}
            </Text>
            {opts && <Text size="xs" c="dimmed" lineClamp={1}>{opts}</Text>}
            {variant.sku && (
                <Badge size="xs" variant="outline" color="gray" style={{ alignSelf: 'flex-start' }}>
                    {variant.sku}
                </Badge>
            )}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text size="sm" fw={800} c="green">{formatPrice(Number(variant.selling_price))}</Text>
                {outOfStock ? (
                    <Badge size="xs" color="red">{t(KEYS.pos.outOfStock)}</Badge>
                ) : (
                    <Text size="xs" c="dimmed">{variant.stock} {t(KEYS.pos.stockRemaining)}</Text>
                )}
            </div>
        </div>
    );
});

PosProductCard.displayName = 'PosProductCard';

export default PosProductCard;
