import React, { useEffect, useState } from 'react';
import { Drawer, Stack, Text, Timeline, Center, Loader } from '@mantine/core';
import type { ProductVariant, StockEntry } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import api from '../../api';

interface Props {
  opened:  boolean;
  variant: ProductVariant | null;
  onClose: () => void;
}

const StockHistoryDrawer: React.FC<Props> = ({ opened, variant, onClose }) => {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!opened || !variant) return;
    setLoading(true);
    setFetchError(false);
    api
      .get<{ data: StockEntry[] }>('/stock', { params: { variantId: variant.id } })
      .then((res) => setEntries(res.data.data))
      .catch(() => { setEntries([]); setFetchError(true); })
      .finally(() => setLoading(false));
  }, [opened, variant?.id]);

  const title = variant
    ? `${t(KEYS.variants.stock.historyTitle)} — ${variant.sku ?? variant.optionValues?.map((ov) => ov.value).join(' / ') ?? ''}`
    : t(KEYS.variants.stock.historyTitle);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="right"
      size="sm"
      padding="xl"
    >
      {loading && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}

      {!loading && fetchError && (
        <Text size="sm" c="red">{t(KEYS.common.error)}</Text>
      )}
      {!loading && !fetchError && entries.length === 0 && (
        <Text size="sm" c="dimmed">{t(KEYS.variants.stock.empty)}</Text>
      )}

      {!loading && !fetchError && entries.length > 0 && (
        <Timeline bulletSize={18} lineWidth={2}>
          {entries.map((entry) => {
            const isAdd = entry.quantity > 0;
            return (
              <Timeline.Item
                key={entry.id}
                bullet={isAdd ? '+' : '−'}
                color={isAdd ? 'green' : 'orange'}
              >
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    {isAdd ? '+' : ''}{entry.quantity} units
                  </Text>
                  {entry.note && (
                    <Text size="xs" c="dimmed">{entry.note}</Text>
                  )}
                  <Text size="xs" c="dimmed">
                    {entry.createdByUser.name} · {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </Stack>
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
    </Drawer>
  );
};

export default StockHistoryDrawer;
