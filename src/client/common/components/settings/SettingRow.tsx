import React from 'react';
import {
    Group, Stack, Text, Badge, Switch, NumberInput,
    TextInput, Textarea, Select, Tooltip, Box,
} from '@mantine/core';
import { Field, FieldProps } from 'formik';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { AppSetting } from '../../types';

interface Props {
    setting:    AppSetting;
    submitting: boolean;
}

const SettingRow: React.FC<Props> = ({ setting, submitting }) => {
    const isReadOnly = !setting.editable;

    return (
        <Box pb="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={8} align="center">
                        <Text size="sm" fw={600}>{setting.label}</Text>
                        {setting.unit && (
                            <Text size="xs" c="dimmed">({setting.unit})</Text>
                        )}
                        {isReadOnly && (
                            <Badge size="xs" variant="outline" color="gray">
                                {t(KEYS.settings.readOnly)}
                            </Badge>
                        )}
                        {setting.restart_required && (
                            <Tooltip
                                label={t(KEYS.settings.restartRequiredHint)}
                                withArrow
                                position="right"
                            >
                                <Badge size="xs" variant="light" color="orange">
                                    {t(KEYS.settings.restartRequired)}
                                </Badge>
                            </Tooltip>
                        )}
                    </Group>
                    {setting.hint && (
                        <Text size="xs" c="dimmed">{setting.hint}</Text>
                    )}
                </Stack>

                <Box w={setting.type === 'boolean' ? 'auto' : 280} style={{ flexShrink: 0 }}>
                    {isReadOnly ? (
                        <Text size="sm" c="dimmed" ff="monospace">{setting.value}</Text>
                    ) : setting.type === 'boolean' ? (
                        <Field name={setting.name}>
                            {({ field, form }: FieldProps) => (
                                <Switch
                                    checked={!!field.value}
                                    onChange={(e) => form.setFieldValue(setting.name, e.currentTarget.checked)}
                                    disabled={submitting}
                                    color="green"
                                />
                            )}
                        </Field>
                    ) : setting.type === 'enum' ? (
                        <Field name={setting.name}>
                            {({ field, form, meta }: FieldProps) => (
                                <Select
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onChange={(v) => form.setFieldValue(setting.name, v ?? '')}
                                    data={(setting.options ?? []).map((o) => ({ value: o, label: o }))}
                                    disabled={submitting}
                                    size="sm"
                                    error={meta.touched && meta.error ? meta.error : undefined}
                                />
                            )}
                        </Field>
                    ) : setting.type === 'number' ? (
                        <Field name={setting.name}>
                            {({ field, form, meta }: FieldProps) => (
                                <NumberInput
                                    value={typeof field.value === 'number' ? field.value : 0}
                                    onChange={(v) => form.setFieldValue(setting.name, v ?? 0)}
                                    min={setting.min ?? 0}
                                    max={setting.max ?? undefined}
                                    disabled={submitting}
                                    size="sm"
                                    error={meta.touched && meta.error ? meta.error : undefined}
                                    rightSection={
                                        setting.unit
                                            ? <Text size="xs" c="dimmed" mr={4}>{setting.unit}</Text>
                                            : undefined
                                    }
                                />
                            )}
                        </Field>
                    ) : setting.type === 'textarea' ? (
                        <Field name={setting.name}>
                            {({ field, form, meta }: FieldProps) => (
                                <Textarea
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onChange={(e) => form.setFieldValue(setting.name, e.currentTarget.value)}
                                    disabled={submitting}
                                    size="sm"
                                    autosize
                                    minRows={2}
                                    maxRows={5}
                                    error={meta.touched && meta.error ? meta.error : undefined}
                                />
                            )}
                        </Field>
                    ) : setting.type === 'time' ? (
                        <Field name={setting.name}>
                            {({ field, form, meta }: FieldProps) => (
                                <TextInput
                                    type="time"
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onChange={(e) => form.setFieldValue(setting.name, e.currentTarget.value)}
                                    disabled={submitting}
                                    size="sm"
                                    error={meta.touched && meta.error ? meta.error : undefined}
                                />
                            )}
                        </Field>
                    ) : (
                        <Field name={setting.name}>
                            {({ field, form, meta }: FieldProps) => (
                                <TextInput
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onChange={(e) => form.setFieldValue(setting.name, e.currentTarget.value)}
                                    disabled={submitting}
                                    size="sm"
                                    error={meta.touched && meta.error ? meta.error : undefined}
                                />
                            )}
                        </Field>
                    )}
                </Box>
            </Group>
        </Box>
    );
};

export default SettingRow;
