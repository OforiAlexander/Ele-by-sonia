import React, { useEffect, useState } from 'react';
import { Modal, TextInput, Select, Button, Group, Stack } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { StaffMember, Role } from '../types';
import RoleFormModal from './RoleFormModal';

interface FormValues {
  name:    string;
  email:   string;
  phone:   string;
  role_id: string;
}

interface Props {
  opened:        boolean;
  onClose:       () => void;
  onSubmit:      (values: FormValues) => Promise<void>;
  staff:         StaffMember | null;
  roles:         Role[];
  onCreateRole:  (name: string, permissionIds: string[]) => Promise<Role>;
}

const empty: FormValues = { name: '', email: '', phone: '', role_id: '' };

const StaffFormModal: React.FC<Props> = ({ opened, onClose, onSubmit, staff, roles, onCreateRole }) => {
  const [values, setValues]             = useState<FormValues>(empty);
  const [submitting, setSubmitting]     = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    if (opened) {
      setValues(
        staff
          ? { name: staff.name, email: staff.email, phone: staff.phone ?? '', role_id: staff.role_id ?? '' }
          : empty,
      );
    }
  }, [opened, staff]);

  const field = (key: keyof FormValues) => (val: string | null) =>
    setValues((prev) => ({ ...prev, [key]: val ?? '' }));

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(values).finally(() => setSubmitting(false));
  };

  const handleRoleCreated = async (name: string, permissionIds: string[]) => {
    const newRole = await onCreateRole(name, permissionIds);
    setValues((prev) => ({ ...prev, role_id: newRole.id }));
    setRoleModalOpen(false);
    return newRole;
  };

  const isEdit      = staff !== null;
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={isEdit ? t(KEYS.staff.form.editTitle) : t(KEYS.staff.form.createTitle)}
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t(KEYS.staff.form.name)}
            placeholder={t(KEYS.staff.form.namePlaceholder)}
            value={values.name}
            onChange={(e) => field('name')(e.currentTarget.value)}
            required
          />
          {!isEdit && (
            <TextInput
              label={t(KEYS.staff.form.email)}
              placeholder={t(KEYS.staff.form.emailPlaceholder)}
              value={values.email}
              onChange={(e) => field('email')(e.currentTarget.value)}
              required
            />
          )}
          <TextInput
            label={t(KEYS.staff.form.phone)}
            placeholder={t(KEYS.staff.form.phonePlaceholder)}
            value={values.phone}
            onChange={(e) => field('phone')(e.currentTarget.value)}
          />
          <div>
            <Select
              label={t(KEYS.staff.form.role)}
              placeholder={t(KEYS.staff.form.rolePlaceholder)}
              data={roleOptions}
              value={values.role_id || null}
              onChange={field('role_id')}
              clearable
            />
            <button
              className="role-create-link"
              onClick={() => setRoleModalOpen(true)}
            >
              {t(KEYS.roles.createNew)}
            </button>
          </div>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose} disabled={submitting}>
              {t(KEYS.common.cancel)}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {isEdit ? t(KEYS.staff.form.submitUpdate) : t(KEYS.staff.form.submitCreate)}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <RoleFormModal
        opened={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onSubmit={handleRoleCreated}
      />
    </>
  );
};

export default StaffFormModal;
