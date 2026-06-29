import React from 'react';
import { Text } from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface Props {
    method: string;
}

const SaleMethodLabel: React.FC<Props> = ({ method }) => {
    if (method === 'cash') return <Text size="sm">{t(KEYS.common.method.cash)}</Text>;
    if (method === 'momo') return <Text size="sm">{t(KEYS.common.method.momo)}</Text>;
    return <Text size="sm">{method}</Text>;
};

export default SaleMethodLabel;
