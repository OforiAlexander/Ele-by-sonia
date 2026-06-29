import React, { useState } from 'react';
import {
  Stack, Group, Button, Modal, TextInput, Table, Text,
  ActionIcon, Tooltip, Center, Loader,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../../common/context/AuthContext';
import { useCategories } from '../../../common/hooks/useCategories';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import api from '../../../common/api';
import type { Category } from '../../../common/types';

const schema = Yup.object({
  name: Yup.string().trim().required(t(KEYS.categories.validation.nameRequired)),
});

const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const { categories, loading, setCategories } = useCategories();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Category | null>(null);

  const canManage = user?.is_owner || !!user?.can_manage_categories;

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: { name: string }) => {
    const name = values.name.trim();
    try {
      if (editing) {
        const res = await api.put(`/categories/${editing.id}`, { name });
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? res.data.data : c)));
        showSuccess(t(KEYS.categories.toast.updated), '');
      } else {
        const res = await api.post('/categories', { name });
        setCategories((prev) => [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name)));
        showSuccess(t(KEYS.categories.toast.created), '');
      }
      closeModal();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(
        t(KEYS.common.error),
        code === 'CONFLICT' ? `"${name}" already exists.` : t(KEYS.categories.toast.error),
      );
    }
  };

  const handleDelete = async (cat: Category) => {
    const ok = await showConfirm(
      t(KEYS.categories.confirm.deleteTitle),
      t(KEYS.categories.confirm.deleteText),
    );
    if (!ok) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showSuccess(t(KEYS.categories.toast.deleted), '');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(
        t(KEYS.common.error),
        code === 'IN_USE' ? t(KEYS.categories.toast.inUse) : t(KEYS.categories.toast.error),
      );
    }
  };

  const title       = editing ? t(KEYS.categories.modal.editTitle) : t(KEYS.categories.modal.addTitle);
  const submitLabel = editing ? t(KEYS.categories.modal.submit) : t(KEYS.categories.addBtn);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <h1 className="ptitle">{t(KEYS.categories.title)}</h1>
          <p className="psub">{t(KEYS.categories.subtitle)}</p>
        </div>
        {canManage && (
          <Button color="green" onClick={openAdd}>
            {t(KEYS.categories.addBtn)}
          </Button>
        )}
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : categories.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed" size="sm">{t(KEYS.categories.empty)}</Text>
        </Center>
      ) : (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t(KEYS.categories.table.name)}</Table.Th>
              <Table.Th>{t(KEYS.categories.table.created)}</Table.Th>
              {canManage && <Table.Th style={{ width: 80 }}>{t(KEYS.categories.table.actions)}</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categories.map((cat) => (
              <Table.Tr key={cat.id}>
                <Table.Td fw={500}>{cat.name}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{new Date(cat.created_at).toLocaleDateString()}</Text>
                </Table.Td>
                {canManage && (
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Tooltip label="Edit">
                        <ActionIcon
                          variant="subtle"
                          color="green"
                          size="sm"
                          onClick={() => openEdit(cat)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleDelete(cat)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={title}
        size="sm"
        centered
      >
        <Formik
          key={editing?.id ?? 'new'}
          initialValues={{ name: editing?.name ?? '' }}
          validationSchema={schema}
          onSubmit={async (values, helpers) => {
            await handleSubmit(values);
            helpers.setSubmitting(false);
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form>
              <Stack gap="md">
                <Field name="name">
                  {({ field }: FieldProps) => (
                    <TextInput
                      {...field}
                      label={t(KEYS.categories.modal.nameLabel)}
                      placeholder={t(KEYS.categories.modal.namePlaceholder)}
                      error={touched.name && errors.name}
                      autoFocus
                      required
                    />
                  )}
                </Field>
                <Group justify="flex-end">
                  <Button variant="subtle" color="gray" onClick={closeModal} disabled={isSubmitting}>
                    {t(KEYS.categories.modal.cancel)}
                  </Button>
                  <Button type="submit" loading={isSubmitting} color="green">
                    {submitLabel}
                  </Button>
                </Group>
              </Stack>
            </Form>
          )}
        </Formik>
      </Modal>
    </Stack>
  );
};

export default CategoriesPage;
