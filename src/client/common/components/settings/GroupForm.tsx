import React, { useRef } from 'react';
import { Stack, Group, Button, Center, Text, Divider } from '@mantine/core';
import { Formik, Form } from 'formik';
import api from '../../api';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { showSuccess, showError } from '../../utils/swal';
import { buildSchema, buildInitialValues } from './settingsHelpers';
import type { GroupKey } from './settingsHelpers';
import DirtyReporter from './DirtyReporter';
import SettingRow from './SettingRow';
import type { AppSetting } from '../../types';

interface Props {
    groupKey:      GroupKey;
    allSettings:   AppSetting[];
    onSaved:       (updated: Record<string, string>) => void;
    onDirtyChange: (groupKey: GroupKey, isDirty: boolean) => void;
}

const GroupForm: React.FC<Props> = ({ groupKey, allSettings, onSaved, onDirtyChange }) => {
    const settings = allSettings.filter((s) => s.group === groupKey);
    const editable = settings.filter((s) => s.editable);
    const schema   = buildSchema(editable);

    // Tracks the last server-confirmed values so we only PATCH fields that changed.
    const savedValuesRef = useRef<Record<string, string>>(
        Object.fromEntries(settings.map((s) => [s.name, s.value])),
    );

    const initialVals = buildInitialValues(settings);

    const handleSubmit = async (
        values: Record<string, string | number | boolean>,
        {
            setSubmitting,
            resetForm,
        }: {
            setSubmitting: (b: boolean) => void;
            resetForm: (nextState?: { values?: Record<string, string | number | boolean> }) => void;
        },
    ) => {
        const updates: Array<Promise<void>> = [];
        const saved:   Record<string, string> = {};
        const errors:  string[] = [];

        for (const s of editable) {
            const raw      = values[s.name];
            const newValue = s.type === 'boolean' ? (raw ? 'true' : 'false') : String(raw ?? '');
            const serverValue = savedValuesRef.current[s.name] ?? s.value;
            if (newValue === serverValue) continue;

            updates.push(
                api.put(`/settings/${s.name}`, { value: newValue })
                    .then(() => { saved[s.name] = newValue; })
                    .catch(() => { errors.push(s.label); }),
            );
        }

        await Promise.all(updates);

        if (errors.length > 0) {
            showError(t(KEYS.common.error), `${t(KEYS.settings.saveError)} (${errors.join(', ')})`);
        } else if (Object.keys(saved).length > 0) {
            for (const [k, v] of Object.entries(saved)) {
                savedValuesRef.current[k] = v;
            }

            const merged = { ...values };
            for (const [k, v] of Object.entries(saved)) {
                const def = settings.find((s) => s.name === k);
                if (def?.type === 'boolean') {
                    merged[k] = v === 'true';
                } else if (def?.type === 'number') {
                    merged[k] = parseFloat(v) || 0;
                } else {
                    merged[k] = v;
                }
            }
            resetForm({ values: merged });

            showSuccess(t(KEYS.settings.saved), '');
            onSaved(saved);
        }

        setSubmitting(false);
    };

    if (settings.length === 0) {
        return (
            <Center py="xl">
                <Text size="sm" c="dimmed">{t(KEYS.settings.emptyGroup)}</Text>
            </Center>
        );
    }

    return (
        <Formik
            initialValues={initialVals}
            validationSchema={schema}
            onSubmit={handleSubmit}
        >
            {({ isSubmitting }) => (
                <Form>
                    <DirtyReporter groupKey={groupKey} onDirtyChange={onDirtyChange} />
                    <Stack gap={0}>
                        {settings.map((s, idx) => (
                            <React.Fragment key={s.name}>
                                {idx > 0 && <Divider mb="md" />}
                                <SettingRow setting={s} submitting={isSubmitting} />
                            </React.Fragment>
                        ))}
                    </Stack>

                    {editable.length > 0 && (
                        <Group justify="flex-end" mt="md" pt="md" style={{ borderTop: '1px solid #ECEFEC' }}>
                            <Button type="submit" color="green" loading={isSubmitting} size="sm">
                                {t(KEYS.settings.saveBtn)}
                            </Button>
                        </Group>
                    )}
                </Form>
            )}
        </Formik>
    );
};

export default GroupForm;
