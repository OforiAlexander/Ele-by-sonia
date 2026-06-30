import React from 'react';
import { SimpleGrid } from '@mantine/core';
import SaleStatCard from '../sales/SaleStatCard';

export interface ReportStatItem {
    label: string;
    value: string;
    color?: string;
}

interface Props {
    items: ReportStatItem[];
    cols?: { base: number; sm?: number; md?: number };
}

const ReportStatGrid: React.FC<Props> = ({ items, cols = { base: 2, sm: 4 } }) => (
    <SimpleGrid cols={cols} spacing="md" mb="md">
        {items.map((item) => (
            <SaleStatCard key={item.label} label={item.label} value={item.value} color={item.color} />
        ))}
    </SimpleGrid>
);

export default ReportStatGrid;
