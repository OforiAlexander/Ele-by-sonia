import React, { useState } from 'react';
import {
  Drawer, Stack, TextInput, Textarea, Button, Group, Select,
  FileButton, Text, SimpleGrid, Image, ActionIcon, Paper, Tooltip,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import type { Product, ProductImage } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { CATEGORIES } from '../../constants/categories';
import { showError } from '../../utils/swal';
import api from '../../api';

interface ProductFormValues {
  name:        string;
  category:    string;
  brand:       string;
  description: string;
}

interface Props {
  opened:    boolean;
  editing:   Product | null;
  onClose:   () => void;
  onSubmit:  (values: ProductFormValues, images: File[]) => Promise<void>;
  onDeleteImage?: (productId: string, imageId: string) => Promise<void>;
}

const schema = Yup.object({
  name:        Yup.string().required(t(KEYS.products.validation.nameRequired)),
  category:    Yup.string().required(t(KEYS.products.validation.categoryRequired)),
  brand:       Yup.string(),
  description: Yup.string(),
});

const empty: ProductFormValues = { name: '', category: '', brand: '', description: '' };

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

const ProductFormDrawer: React.FC<Props> = ({ opened, editing, onClose, onSubmit, onDeleteImage }) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const initial: ProductFormValues = editing
    ? {
        name:        editing.name,
        category:    editing.category,
        brand:       editing.brand ?? '',
        description: editing.description ?? '',
      }
    : empty;

  const title      = editing ? t(KEYS.products.drawer.editTitle) : t(KEYS.products.drawer.addTitle);
  const submitLabel = editing ? t(KEYS.products.drawer.submitEdit) : t(KEYS.products.drawer.submitAdd);
  const existingImages: ProductImage[] = editing?.images ?? [];

  const handleDeleteImage = async (imageId: string) => {
    if (!editing || !onDeleteImage) return;
    setDeletingId(imageId);
    try {
      await onDeleteImage(editing.id, imageId);
    } catch {
      showError(t(KEYS.common.error), 'Failed to remove image.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = () => {
    setPendingFiles([]);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={title}
      position="right"
      size="md"
      padding="xl"
    >
      <Formik
        key={editing?.id ?? 'new'}
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (values, helpers) => {
          await onSubmit(values, pendingFiles);
          setPendingFiles([]);
          helpers.setSubmitting(false);
        }}
      >
        {({ isSubmitting, errors, touched, setFieldValue, values }) => (
          <Form>
            <Stack gap="md">
              <Field name="name">
                {({ field }: FieldProps) => (
                  <TextInput
                    {...field}
                    label={t(KEYS.products.drawer.nameLabel)}
                    placeholder={t(KEYS.products.drawer.namePlaceholder)}
                    error={touched.name && errors.name}
                    required
                  />
                )}
              </Field>

              <Select
                label={t(KEYS.products.drawer.categoryLabel)}
                placeholder={t(KEYS.products.drawer.categoryPlaceholder)}
                data={CATEGORY_OPTIONS}
                value={values.category || null}
                onChange={(val) => setFieldValue('category', val ?? '')}
                error={touched.category && errors.category}
                searchable
                allowDeselect={false}
                required
              />

              <Field name="brand">
                {({ field }: FieldProps) => (
                  <TextInput
                    {...field}
                    label={t(KEYS.products.drawer.brandLabel)}
                    placeholder={t(KEYS.products.drawer.brandPlaceholder)}
                  />
                )}
              </Field>

              <Field name="description">
                {({ field }: FieldProps) => (
                  <Textarea
                    {...field}
                    label={t(KEYS.products.drawer.descLabel)}
                    placeholder={t(KEYS.products.drawer.descPlaceholder)}
                    rows={3}
                  />
                )}
              </Field>

              {existingImages.length > 0 && (
                <Stack gap={6}>
                  <Text size="sm" fw={500}>Current images</Text>
                  <SimpleGrid cols={4} spacing={6}>
                    {existingImages.map((img) => (
                      <Paper key={img.id} withBorder radius="sm" style={{ position: 'relative', overflow: 'hidden' }}>
                        <Image
                          src={img.image_path}
                          height={70}
                          fit="cover"
                          radius="sm"
                        />
                        {onDeleteImage && (
                          <Tooltip label="Remove">
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="filled"
                              radius="xl"
                              loading={deletingId === img.id}
                              onClick={() => handleDeleteImage(img.id)}
                              style={{ position: 'absolute', top: 4, right: 4 }}
                            >
                              ✕
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Stack>
              )}

              <Stack gap={6}>
                <Text size="sm" fw={500}>
                  {editing ? 'Add more images' : 'Product images'}
                  <Text span size="xs" c="dimmed"> (JPEG/PNG, up to 8)</Text>
                </Text>
                <FileButton
                  onChange={(files) => setPendingFiles(files)}
                  accept="image/jpeg,image/png"
                  multiple
                >
                  {(props) => (
                    <Button {...props} variant="light" color="gray" size="xs">
                      Choose files
                    </Button>
                  )}
                </FileButton>
                {pendingFiles.length > 0 && (
                  <Stack gap={4}>
                    {pendingFiles.map((f, i) => (
                      <Group key={i} justify="space-between" gap={4}>
                        <Text size="xs" c="dimmed" style={{ flex: 1 }} truncate>{f.name}</Text>
                        <ActionIcon
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        >
                          ✕
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Group justify="flex-end" mt="sm">
                <Button variant="subtle" color="gray" onClick={handleClose} disabled={isSubmitting}>
                  {t(KEYS.products.drawer.cancel)}
                </Button>
                <Button type="submit" loading={isSubmitting} color="green">
                  {submitLabel}
                </Button>
              </Group>
            </Stack>
          </Form>
        )}
      </Formik>
    </Drawer>
  );
};

export default ProductFormDrawer;
