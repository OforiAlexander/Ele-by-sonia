import React from 'react';
import { Paper, Text } from '@mantine/core';

interface Props {
    label: string;
    value: string;
    color?: string;
}

const SaleStatCard: React.FC<Props> = ({ label, value, color }) => (
    <Paper withBorder p="md" radius="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>{label}</Text>
        <Text size="xl" fw={700} c={color ?? 'dark'}>{value}</Text>
    </Paper>
);

export default SaleStatCard;
