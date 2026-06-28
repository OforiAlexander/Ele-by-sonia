import React, { useState } from 'react';
import { useFormik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Modal, TextInput, Select, Button, Group, Stack, Text, Anchor } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { StaffMember, Role } from '../types';
import RoleFormModal from './RoleFormModal';

export interface StaffFormValues {
  name:    string;
  email:   string;
  phone:   string;
  role_id: string;
}

interface Props {
  opened:       boolean;
  onClose:      () => void;
  onSubmit:     (values: StaffFormValues, helpers: FormikHelpers<StaffFormValues>) => Promise<void>;
  staff:        StaffMember | null;
  roles:        Role[];
  onCreateRole: (name: string, permissionIds: string[]) => Promise<Role>;
}

const empty: StaffFormValues = { name: '', email: '', phone: '', role_id: '' };

const createSchema = Yup.object({
  name:    Yup.string().trim().required(t(KEYS.staff.form.validation.nameRequired)),
  email:   Yup.string()
    .email(t(KEYS.staff.form.validation.emailInvalid))
    .required(t(KEYS.staff.form.validation.emailRequired)),
  phone:   Yup.string(),
  role_id: Yup.string().required(t(KEYS.staff.form.validation.roleRequired)),
});

const editSchema = Yup.object({
  name:    Yup.string().trim().required(t(KEYS.staff.form.validation.nameRequired)),
  phone:   Yup.string(),
  role_id: Yup.string().required(t(KEYS.staff.form.validation.roleRequired)),
});

const StaffFormModal: React.FC<Props> = ({ opened, onClose, onSubmit, staff, roles, onCreateRole }) => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const isEdit = staff !== null;

  const formik = useFormik<StaffFormValues>({
    initialValues: staff
      ? { name: staff.name, email: staff.email, phone: staff.phone ?? '', role_id: staff.role_id ?? '' }
      : empty,
    enableReinitialize: true,
    validationSchema: isEdit ? editSchema : createSchema,
    onSubmit: async (values, helpers) => {
      await onSubmit(values, helpers);
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  const handleRoleCreated = async (name: string, permissionIds: string[]) => {
    const newRole = await onCreateRole(name, permissionIds);
    await formik.setFieldValue('role_id', newRole.id);
    setRoleModalOpen(false);
    return newRole;
  };

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  const roleLabel = (
    <Group justify="space-between" gap="xs" wrap="nowrap" style={{ width: '100%' }}>
      <span>{t(KEYS.staff.form.role)} <span style={{ color: 'var(--mantine-color-red-6)' }}>*</span></span>
      <Anchor
        size="xs"
        component="button"
        type="button"
        onClick={() => setRoleModalOpen(true)}
      >
        {t(KEYS.roles.createNew)}
      </Anchor>
    </Group>
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={isEdit ? t(KEYS.staff.form.editTitle) : t(KEYS.staff.form.createTitle)}
        size="lg"
        centered
      >
        <form onSubmit={formik.handleSubmit} noValidate>
          <Stack gap="sm">
            <TextInput
              label={t(KEYS.staff.form.name)}
              placeholder={t(KEYS.staff.form.namePlaceholder)}
              {...formik.getFieldProps('name')}
              error={formik.touched.name ? formik.errors.name : undefined}
              required
            />

            {!isEdit && (
              <>
                <TextInput
                  label={t(KEYS.staff.form.email)}
                  placeholder={t(KEYS.staff.form.emailPlaceholder)}
                  type="email"
                  {...formik.getFieldProps('email')}
                  error={formik.touched.email ? formik.errors.email : undefined}
                  required
                />
                <Text size="xs" c="dimmed" mt={-6}>
                  {t(KEYS.staff.form.inviteHint)}
                </Text>
              </>
            )}

            <TextInput
              label={t(KEYS.staff.form.phone)}
              placeholder={t(KEYS.staff.form.phonePlaceholder)}
              {...formik.getFieldProps('phone')}
              error={formik.touched.phone ? formik.errors.phone : undefined}
            />

            <Select
              label={roleLabel}
              placeholder={t(KEYS.staff.form.rolePlaceholder)}
              data={roleOptions}
              value={formik.values.role_id || null}
              onChange={(val) => {
                formik.setFieldValue('role_id', val ?? '');
                formik.setFieldTouched('role_id', true, false);
              }}
              onBlur={() => formik.setFieldTouched('role_id')}
              error={formik.touched.role_id ? formik.errors.role_id : undefined}
              searchable
            />

            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                type="button"
                onClick={handleClose}
                disabled={formik.isSubmitting}
              >
                {t(KEYS.common.cancel)}
              </Button>
              <Button type="submit" loading={formik.isSubmitting}>
                {isEdit ? t(KEYS.staff.form.submitUpdate) : t(KEYS.staff.form.submitCreate)}
              </Button>
            </Group>
          </Stack>
        </form>
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
