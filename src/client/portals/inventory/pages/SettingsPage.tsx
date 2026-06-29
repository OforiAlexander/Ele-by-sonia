import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, Loader, Center, Paper, Stack } from '@mantine/core';
import api from '../../../common/api';
import { useAuth } from '../../../common/context/AuthContext';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showError, showConfirm } from '../../../common/utils/swal';
import { GROUPS } from '../../../common/components/settings/settingsHelpers';
import type { GroupKey } from '../../../common/components/settings/settingsHelpers';
import GroupForm from '../../../common/components/settings/GroupForm';
import SettingsReadOnlyList from '../../../common/components/settings/SettingsReadOnlyList';
import type { AppSetting } from '../../../common/types';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const canUpdate = user?.is_owner || !!user?.can_update_settings;

    const [settings,   setSettings]   = useState<AppSetting[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [activeTab,  setActiveTab]  = useState<string>('general');

    // Tracks which groups have unsaved dirty changes
    const dirtyGroupsRef = useRef<Partial<Record<GroupKey, boolean>>>({});

    // Incrementing a group's key forces its GroupForm to remount with fresh Formik state,
    // discarding dirty values when the user confirms abandoning changes.
    const [resetKeys, setResetKeys] = useState<Partial<Record<GroupKey, number>>>({});

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/settings');
            setSettings(res.data.data ?? []);
        } catch {
            showError(t(KEYS.common.error), t(KEYS.settings.saveError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleSaved = useCallback((updated: Record<string, string>) => {
        setSettings((prev) =>
            prev.map((s) => s.name in updated ? { ...s, value: updated[s.name] } : s),
        );
    }, []);

    const handleDirtyChange = useCallback((groupKey: GroupKey, isDirty: boolean) => {
        dirtyGroupsRef.current[groupKey] = isDirty;
    }, []);

    const handleTabChange = async (nextTab: string | null) => {
        if (!nextTab || nextTab === activeTab) return;

        if (dirtyGroupsRef.current[activeTab as GroupKey]) {
            const result = await showConfirm(
                t(KEYS.settings.unsavedPrompt),
                t(KEYS.settings.unsavedBody),
            );
            if (!result.isConfirmed) return;

            // Mark as clean and increment the reset key to force GroupForm remount,
            // which gives a fresh Formik instance with the last server-confirmed values.
            dirtyGroupsRef.current[activeTab as GroupKey] = false;
            setResetKeys((prev) => ({
                ...prev,
                [activeTab]: (prev[activeTab as GroupKey] ?? 0) + 1,
            }));
        }

        setActiveTab(nextTab);
    };

    if (loading) {
        return <Center py="xl"><Loader size="sm" /></Center>;
    }

    return (
        <Stack gap="xl">
            <div>
                <h1 className="ptitle">{t(KEYS.settings.title)}</h1>
                <p className="psub">{t(KEYS.settings.subtitle)}</p>
            </div>

            <Paper withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                <Tabs value={activeTab} onChange={handleTabChange} color="green">
                    <Tabs.List style={{ borderBottom: '1px solid #ECEFEC', padding: '0 16px' }}>
                        {GROUPS.map((g) => (
                            <Tabs.Tab key={g.key} value={g.key}>
                                {g.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>

                    {GROUPS.map((g) => (
                        <Tabs.Panel key={g.key} value={g.key} p="xl">
                            {canUpdate ? (
                                <GroupForm
                                    key={`${g.key}-${resetKeys[g.key] ?? 0}`}
                                    groupKey={g.key}
                                    allSettings={settings}
                                    onSaved={handleSaved}
                                    onDirtyChange={handleDirtyChange}
                                />
                            ) : (
                                <SettingsReadOnlyList settings={settings} group={g.key} />
                            )}
                        </Tabs.Panel>
                    ))}
                </Tabs>
            </Paper>
        </Stack>
    );
};

export default SettingsPage;
