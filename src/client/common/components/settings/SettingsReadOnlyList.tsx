import React from 'react';
import { Stack, Group, Text, Badge, Divider, Box, Tooltip } from '@mantine/core';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { AppSetting } from '../../types';
import type { GroupKey } from './settingsHelpers';

interface Props {
    settings: AppSetting[];
    group:    GroupKey;
}

const SettingsReadOnlyList: React.FC<Props> = ({ settings, group }) => {
    const filtered = settings.filter((s) => s.group === group);

    return (
        <Stack gap={0}>
            {filtered.map((s, idx) => (
                <React.Fragment key={s.name}>
                    {idx > 0 && <Divider mb="md" />}
                    <Box pb="md">
                        <Group justify="space-between" wrap="nowrap">
                            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                <Group gap={8} align="center">
                                    <Text size="sm" fw={600}>{s.label}</Text>
                                    {s.unit && <Text size="xs" c="dimmed">({s.unit})</Text>}
                                    {s.restart_required && (
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
                                {s.hint && <Text size="xs" c="dimmed">{s.hint}</Text>}
                            </Stack>
                            <Text size="sm" ff="monospace" c="dimmed">{s.value || '—'}</Text>
                        </Group>
                    </Box>
                </React.Fragment>
            ))}
        </Stack>
    );
};

export default SettingsReadOnlyList;
