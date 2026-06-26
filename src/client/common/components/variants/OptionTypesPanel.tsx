import React, { useState } from 'react';
import {
  Stack, Group, Text, TextInput, ActionIcon, Badge, Divider, Paper, Tooltip,
} from '@mantine/core';
import type { ProductOptionType } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { showConfirm, showError } from '../../utils/swal';
import api from '../../api';

interface Props {
  productId:      string;
  optionTypes:    ProductOptionType[];
  canEdit:        boolean;
  onTypesChange:  (fn: (prev: ProductOptionType[]) => ProductOptionType[]) => void;
}

const OptionTypesPanel: React.FC<Props> = ({ productId, optionTypes, canEdit, onTypesChange }) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType]   = useState(false);
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  const [addingValue, setAddingValue] = useState<Record<string, boolean>>({});

  const handleAddType = async () => {
    const name = newTypeName.trim();
    if (!name) return;
    setAddingType(true);
    try {
      const res = await api.post('/variants/option-types', { product_id: productId, name });
      onTypesChange((prev) => [...prev, res.data.data]);
      setNewTypeName('');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    } finally {
      setAddingType(false);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    const ok = await showConfirm(
      t(KEYS.variants.options.deleteTypeTitle),
      t(KEYS.variants.options.deleteTypeText),
    );
    if (!ok) return;
    try {
      await api.delete(`/variants/option-types/${typeId}`);
      onTypesChange((prev) => prev.filter((t) => t.id !== typeId));
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  const handleAddValue = async (typeId: string) => {
    const value = (valueInputs[typeId] ?? '').trim();
    if (!value) return;
    setAddingValue((s) => ({ ...s, [typeId]: true }));
    try {
      const res = await api.post(`/variants/option-types/${typeId}/values`, { value });
      onTypesChange((prev) =>
        prev.map((ot) =>
          ot.id === typeId
            ? { ...ot, values: [...ot.values, res.data.data] }
            : ot,
        ),
      );
      setValueInputs((s) => ({ ...s, [typeId]: '' }));
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    } finally {
      setAddingValue((s) => ({ ...s, [typeId]: false }));
    }
  };

  const handleDeleteValue = async (typeId: string, valueId: string) => {
    try {
      await api.delete(`/variants/option-values/${valueId}`);
      onTypesChange((prev) =>
        prev.map((ot) =>
          ot.id === typeId
            ? { ...ot, values: ot.values.filter((v) => v.id !== valueId) }
            : ot,
        ),
      );
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Text fw={600} size="sm">{t(KEYS.variants.options.panelTitle)}</Text>

        {optionTypes.length === 0 && (
          <Text size="sm" c="dimmed">{t(KEYS.variants.options.emptyTypes)}</Text>
        )}

        {optionTypes.map((ot) => (
          <Stack key={ot.id} gap={6}>
            <Group justify="space-between">
              <Text size="sm" fw={500}>{ot.name}</Text>
              {canEdit && (
                <Tooltip label="Remove option type">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => handleDeleteType(ot.id)}
                  >
                    ✕
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>

            <Group gap={6} wrap="wrap">
              {ot.values.map((v) => (
                <Badge
                  key={v.id}
                  variant="light"
                  color="blue"
                  size="sm"
                  rightSection={
                    canEdit ? (
                      <ActionIcon
                        size="xs"
                        color="blue"
                        variant="transparent"
                        onClick={() => handleDeleteValue(ot.id, v.id)}
                      >
                        ✕
                      </ActionIcon>
                    ) : undefined
                  }
                >
                  {v.value}
                </Badge>
              ))}
            </Group>

            {canEdit && (
              <Group gap={6}>
                <TextInput
                  size="xs"
                  placeholder={t(KEYS.variants.options.addValuePlaceholder)}
                  value={valueInputs[ot.id] ?? ''}
                  onChange={(e) => setValueInputs((s) => ({ ...s, [ot.id]: e.currentTarget.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddValue(ot.id); } }}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  color="green"
                  variant="light"
                  size="sm"
                  loading={addingValue[ot.id]}
                  onClick={() => handleAddValue(ot.id)}
                >
                  +
                </ActionIcon>
              </Group>
            )}

            <Divider />
          </Stack>
        ))}

        {canEdit && (
          <Group gap={6}>
            <TextInput
              size="xs"
              placeholder={t(KEYS.variants.options.addTypePlaceholder)}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddType(); } }}
              style={{ flex: 1 }}
            />
            <ActionIcon
              color="green"
              variant="filled"
              size="sm"
              loading={addingType}
              onClick={handleAddType}
            >
              +
            </ActionIcon>
          </Group>
        )}
      </Stack>
    </Paper>
  );
};

export default OptionTypesPanel;
