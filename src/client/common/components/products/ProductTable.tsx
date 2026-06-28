import React from 'react';
import { Table, Badge, ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface Props {
  products:     Product[];
  onEdit:       (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  canUpdate:    boolean;
  canDelete:    boolean;
}

const ProductTable: React.FC<Props> = ({ products, onEdit, onToggleStatus, canUpdate, canDelete }) => {
  const navigate = useNavigate();

  if (products.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        {t(KEYS.products.empty)}
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t(KEYS.products.table.name)}</Table.Th>
          <Table.Th>{t(KEYS.products.table.brand)}</Table.Th>
          <Table.Th style={{ width: 90 }}>{t(KEYS.products.table.variants)}</Table.Th>
          <Table.Th style={{ width: 90 }}>{t(KEYS.products.table.status)}</Table.Th>
          <Table.Th style={{ width: 120 }}>{t(KEYS.products.table.actions)}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {products.map((p) => (
          <Table.Tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.6 }}>
            <Table.Td>
              <Group gap="sm" wrap="nowrap">
                {p.images?.[0] && (
                  <img
                    src={p.images[0].image_path}
                    alt={p.name}
                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  />
                )}
                <div>
                  <Text fw={500} size="sm" lh={1.3}>{p.name}</Text>
                  <Text size="xs" c="dimmed" lh={1.3}>{p.category}</Text>
                </div>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">{p.brand ?? '—'}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" ta="center">{p.variants?.length ?? '—'}</Text>
            </Table.Td>
            <Table.Td>
              <Badge
                color={p.is_active ? 'green' : 'gray'}
                variant="light"
                size="sm"
              >
                {p.is_active ? t(KEYS.products.status.active) : t(KEYS.products.status.inactive)}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap={4} wrap="nowrap">
                <Tooltip label={t(KEYS.products.viewVariants)}>
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    size="sm"
                    onClick={() => navigate(`/variants?productId=${p.id}`)}
                  >
                    ↗
                  </ActionIcon>
                </Tooltip>
                {canUpdate && (
                  <Tooltip label={t(KEYS.common.edit)}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => onEdit(p)}
                    >
                      ✎
                    </ActionIcon>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip label={p.is_active ? t(KEYS.products.confirm.deactivateTitle) : t(KEYS.products.confirm.activateTitle)}>
                    <ActionIcon
                      variant="subtle"
                      color={p.is_active ? 'red' : 'green'}
                      size="sm"
                      onClick={() => onToggleStatus(p)}
                    >
                      {p.is_active ? '✕' : '↺'}
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

export default ProductTable;
