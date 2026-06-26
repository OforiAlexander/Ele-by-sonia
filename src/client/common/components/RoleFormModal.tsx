import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button, Checkbox, Divider, Group, Modal, ScrollArea, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { t } from '../translations';
import { KEYS } from '../keys';
import { Role } from '../types';
import { showError } from '../utils/swal';
import { usePermissions } from '../hooks/usePermissions';

interface Props {
  opened:   boolean;
  onClose:  () => void;
  onSubmit: (name: string, permissionIds: string[]) => Promise<Role>;
}

const nameSchema = Yup.object({
  name: Yup.string().trim().required(t(KEYS.roles.form.nameRequired)),
});

function resourceLabel(resource: string): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

const RoleFormModal: React.FC<Props> = ({ opened, onClose, onSubmit }) => {
  const { permissions, loading } = usePermissions();
  const [selected, setSelected] = useState<string[]>([]);

  const formik = useFormik({
    initialValues: { name: '' },
    validationSchema: nameSchema,
    onSubmit: async ({ name }) => {
      try {
        await onSubmit(name.trim(), selected);
        formik.resetForm();
        setSelected([]);
      } catch {
        showError(t(KEYS.roles.errorCreateTitle), t(KEYS.roles.errorCreateFallback));
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setSelected([]);
    onClose();
  };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const entries = Object.entries(permissions);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t(KEYS.roles.form.title)}
      size="xl"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={formik.handleSubmit} noValidate>
        <Stack gap="md">
          <TextInput
            label={t(KEYS.roles.form.name)}
            placeholder={t(KEYS.roles.form.namePlaceholder)}
            {...formik.getFieldProps('name')}
            error={formik.touched.name ? formik.errors.name : undefined}
            required
          />

          <div>
            <Text size="sm" fw={500} mb="xs">{t(KEYS.roles.form.permissions)}</Text>
            {loading ? (
              <Stack gap="xs">
                {[1, 2, 3].map((i) => <Skeleton key={i} height={36} radius="sm" />)}
              </Stack>
            ) : (
              <Stack gap="md">
                {entries.map(([resource, perms], idx) => (
                  <React.Fragment key={resource}>
                    <Stack gap="xs">
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
                        {resourceLabel(resource)}
                      </Text>
                      {perms.map((p) => (
                        <Checkbox
                          key={p.id}
                          label={p.label}
                          checked={selected.includes(p.id)}
                          onChange={() => toggle(p.id)}
                        />
                      ))}
                    </Stack>
                    {idx < entries.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </Stack>
            )}
          </div>

          <Group justify="flex-end" mt="xs">
            <Button variant="default" type="button" onClick={handleClose} disabled={formik.isSubmitting}>
              {t(KEYS.common.cancel)}
            </Button>
            <Button type="submit" loading={formik.isSubmitting}>
              {t(KEYS.roles.form.submit)}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default RoleFormModal;
