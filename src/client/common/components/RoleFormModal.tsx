import React, { useState } from 'react';
import { Modal, TextInput, Checkbox, Button, Group, Stack, Skeleton } from '@mantine/core';
import Swal from 'sweetalert2';
import { t } from '../translations';
import { KEYS } from '../keys';
import { Role } from '../types';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  opened:   boolean;
  onClose:  () => void;
  onSubmit: (name: string, permissionIds: string[]) => Promise<Role>;
}

function resourceLabel(resource: string): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

const RoleFormModal: React.FC<Props> = ({ opened, onClose, onSubmit }) => {
  const { permissions, loading } = usePermissions();
  const [name, setName]                     = useState('');
  const [selected, setSelected]             = useState<string[]>([]);
  const [submitting, setSubmitting]         = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleClose = () => {
    setName('');
    setSelected([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), selected);
      setName('');
      setSelected([]);
    } catch {
      Swal.fire({
        title: t(KEYS.roles.errorCreateTitle),
        text:  t(KEYS.roles.errorCreateFallback),
        icon:  'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t(KEYS.roles.form.title)}
      size="lg"
      centered
    >
      <Stack gap="md">
        <TextInput
          label={t(KEYS.roles.form.name)}
          placeholder={t(KEYS.roles.form.namePlaceholder)}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
        />

        <div>
          <span className="role-form-permissions-label">{t(KEYS.roles.form.permissions)}</span>
          {loading ? (
            <Stack gap="xs" mt="xs">
              {[1, 2, 3].map((i) => <Skeleton key={i} height={36} radius="sm" />)}
            </Stack>
          ) : (
            <div className="role-form-groups">
              {Object.entries(permissions).map(([resource, perms]) => (
                <div key={resource} className="role-form-group">
                  <span className="role-form-group-name">{resourceLabel(resource)}</span>
                  <div className="role-form-checkboxes">
                    {perms.map((p) => (
                      <div key={p.id} className="role-form-checkbox-item">
                        <Checkbox
                          label={
                            <span className="role-form-checkbox-label">
                              {p.label}
                              {p.is_sensitive && (
                                <span className="role-form-sensitive-tag">
                                  {t(KEYS.roles.form.sensitive)}
                                </span>
                              )}
                            </span>
                          }
                          checked={selected.includes(p.id)}
                          onChange={() => toggle(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={handleClose} disabled={submitting}>
            {t(KEYS.common.cancel)}
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!name.trim()}>
            {t(KEYS.roles.form.submit)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default RoleFormModal;
