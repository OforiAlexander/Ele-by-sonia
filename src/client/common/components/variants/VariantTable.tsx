import React, { useEffect } from 'react';
import { Table, Badge, ActionIcon, Group, Text, Tooltip, NumberInput } from '@mantine/core';
import type { ProductVariant } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { formatCurrency } from '../../utils/formatCurrency';

type StockStatus = 'active' | 'lowStock' | 'outOfStock' | 'inactive';

function getStockStatus(v: ProductVariant): StockStatus {
  if (!v.is_active) return 'inactive';
  if (v.stock === 0) return 'outOfStock';
  if (v.stock <= v.low_stock_threshold) return 'lowStock';
  return 'active';
}

const STATUS_COLOR: Record<StockStatus, string> = {
  active:     'green',
  lowStock:   'yellow',
  outOfStock: 'red',
  inactive:   'gray',
};

interface ThresholdCellProps {
  variant:   ProductVariant;
  canSet:    boolean;
  onSave:    (variantId: string, threshold: number) => Promise<void>;
}

const ThresholdCell: React.FC<ThresholdCellProps> = ({ variant, canSet, onSave }) => {
  const [value, setValue]     = React.useState<number>(variant.low_stock_threshold);
  const [saving, setSaving]   = React.useState(false);

  useEffect(() => {
    setValue(variant.low_stock_threshold);
  }, [variant.low_stock_threshold]);

  const dirty = value !== variant.low_stock_threshold;

  const save = async () => {
    setSaving(true);
    await onSave(variant.id, value);
    setSaving(false);
  };

  if (!canSet) {
    return <Text size="sm" ta="center">{variant.low_stock_threshold}</Text>;
  }

  return (
    <Group gap={4} wrap="nowrap">
      <NumberInput
        value={value}
        onChange={(v) => setValue(Number(v) || 0)}
        min={0}
        size="xs"
        w={60}
        hideControls
      />
      {dirty && (
        <ActionIcon size="xs" color="green" variant="light" loading={saving} onClick={save}>
          ✓
        </ActionIcon>
      )}
    </Group>
  );
};

interface Props {
  variants:      ProductVariant[];
  canAddStock:   boolean;
  canAdjust:     boolean;
  canSetThresh:  boolean;
  canToggle:     boolean;
  onAddStock:    (variant: ProductVariant) => void;
  onAdjust:      (variant: ProductVariant) => void;
  onHistory:     (variant: ProductVariant) => void;
  onToggleActive:(variant: ProductVariant) => void;
  onSetThreshold:(variantId: string, threshold: number) => Promise<void>;
}

const VariantTable: React.FC<Props> = ({
  variants,
  canAddStock,
  canAdjust,
  canSetThresh,
  canToggle,
  onAddStock,
  onAdjust,
  onHistory,
  onToggleActive,
  onSetThreshold,
}) => {
  if (variants.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        {t(KEYS.variants.empty)}
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t(KEYS.variants.table.sku)}</Table.Th>
          <Table.Th>{t(KEYS.variants.table.options)}</Table.Th>
          <Table.Th style={{ width: 80 }}>{t(KEYS.variants.table.costPrice)}</Table.Th>
          <Table.Th style={{ width: 80 }}>{t(KEYS.variants.table.sellPrice)}</Table.Th>
          <Table.Th style={{ width: 70 }}>{t(KEYS.variants.table.stock)}</Table.Th>
          <Table.Th style={{ width: 100 }}>{t(KEYS.variants.table.threshold)}</Table.Th>
          <Table.Th style={{ width: 80 }}>{t(KEYS.variants.table.status)}</Table.Th>
          <Table.Th style={{ width: 140 }}>{t(KEYS.variants.table.actions)}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {variants.map((v) => {
          const status = getStockStatus(v);
          const optLabel = v.optionValues?.map((ov) => `${ov.optionType?.name ?? ''}: ${ov.value}`).join(', ') || '—';
          return (
            <Table.Tr key={v.id} style={{ opacity: v.is_active ? 1 : 0.6 }}>
              <Table.Td>
                <Text size="sm" c="dimmed">{v.sku ?? '—'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{optLabel}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{formatCurrency(parseFloat(v.cost_price))}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>{formatCurrency(parseFloat(v.selling_price))}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ta="center" fw={status === 'outOfStock' ? 700 : undefined} c={status === 'outOfStock' ? 'red' : undefined}>
                  {v.stock}
                </Text>
              </Table.Td>
              <Table.Td>
                <ThresholdCell variant={v} canSet={canSetThresh} onSave={onSetThreshold} />
              </Table.Td>
              <Table.Td>
                <Badge color={STATUS_COLOR[status]} variant="light" size="sm">
                  {t(KEYS.variants.status[status])}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="nowrap">
                  {canAddStock && (
                    <Tooltip label={t(KEYS.variants.stock.addBtn)}>
                      <ActionIcon variant="subtle" color="green" size="sm" onClick={() => onAddStock(v)}>
                        +
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {canAdjust && (
                    <Tooltip label={t(KEYS.variants.stock.adjustBtn)}>
                      <ActionIcon variant="subtle" color="orange" size="sm" onClick={() => onAdjust(v)}>
                        ±
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label={t(KEYS.variants.stock.historyBtn)}>
                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => onHistory(v)}>
                      ≡
                    </ActionIcon>
                  </Tooltip>
                  {canToggle && (
                    <Tooltip label={v.is_active ? t(KEYS.variants.tooltip.deactivate) : t(KEYS.variants.tooltip.activate)}>
                      <ActionIcon
                        variant="subtle"
                        color={v.is_active ? 'red' : 'green'}
                        size="sm"
                        onClick={() => onToggleActive(v)}
                      >
                        {v.is_active ? '✕' : '↺'}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
};

export default VariantTable;
