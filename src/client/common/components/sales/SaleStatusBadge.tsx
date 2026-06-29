import React from 'react';
import { Badge } from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface Props {
    status:  string;
    voided?: boolean;
}

const SaleStatusBadge: React.FC<Props> = ({ status, voided }) => {
    if (voided)             return <Badge color="gray"   size="sm">{t(KEYS.salesHistory.status.voided)}</Badge>;
    if (status === 'paid')    return <Badge color="green"  size="sm">{t(KEYS.salesHistory.status.paid)}</Badge>;
    if (status === 'pending') return <Badge color="yellow" size="sm">{t(KEYS.salesHistory.status.pending)}</Badge>;
    if (status === 'failed')  return <Badge color="red"    size="sm">{t(KEYS.salesHistory.status.failed)}</Badge>;
    return <Badge size="sm">{status}</Badge>;
};

export default SaleStatusBadge;
