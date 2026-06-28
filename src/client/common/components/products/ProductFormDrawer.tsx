import React, { useState } from 'react';
import {
  Modal, Stack, TextInput, Textarea, Button, Group, Select, Text,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import type { Product, ProductImage } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { useCategories } from '../../hooks/useCategories';
import ImageUploadField from '../ImageUploadField';

interface ProductFormValues {
  name:        string;
  category:    string;
  brand:       string;
  description: string;
}

interface Props {
  opened:         boolean;
  editing:        Product | null;
  onClose:        () => void;
  onSubmit:       (values: ProductFormValues, images: File[]) => Promise<void>;
  onDeleteImage?: (productId: string, imageId: string) => Promise<void>;
}

const schema = Yup.object({
  name:        Yup.string().required(t(KEYS.products.validation.nameRequired)),
  category:    Yup.string().required(t(KEYS.products.validation.categoryRequired)),
  brand:       Yup.string(),
  description: Yup.string(),
});

const empty: ProductFormValues = { name: '', category: '', brand: '', description: '' };

const ProductFormDrawer: React.FC<Props> = ({ opened, editing, onClose, onSubmit, onDeleteImage }) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [imageError, setImageError]     = useState<string | null>(null);
  const { categories, loading: categoriesLoading } = useCategories();
  const categoryOptions = categories.map((c) => ({ value: c.name, label: c.name }));

  const initial: ProductFormValues = editing
    ? {
        name:        editing.name,
        category:    editing.category,
        brand:       editing.brand ?? '',
        description: editing.description ?? '',
      }
    : empty;

  const title       = editing ? t(KEYS.products.drawer.editTitle) : t(KEYS.products.drawer.addTitle);
  const submitLabel = editing ? t(KEYS.products.drawer.submitEdit) : t(KEYS.products.drawer.submitAdd);
  const existingImages: ProductImage[] = editing?.images ?? [];

  const handleDeleteExisting = async (imageId: string) => {
    if (!editing || !onDeleteImage) return;
    await onDeleteImage(editing.id, imageId);
  };

  const handleClose = () => {
    setPendingFiles([]);
    setImageError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      size="lg"
      centered
    >
      <Formik
        key={editing?.id ?? 'new'}
        initialValues={initial}
        validationSchema={schema}
        onSubmit={async (values, helpers) => {
          if (!editing && pendingFiles.length === 0) {
            setImageError(t(KEYS.products.images.required));
            helpers.setSubmitting(false);
            return;
          }
          setImageError(null);
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
                data={categoryOptions}
                value={values.category || null}
                onChange={(val) => setFieldValue('category', val ?? '')}
                error={touched.category && errors.category}
                disabled={categoriesLoading}
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

              <Stack gap={6}>
                <Text size="sm" fw={500}>
                  {t(KEYS.products.images.sectionLabel)}
                  {!editing && <Text span c="red" ml={4}>*</Text>}
                </Text>
                <ImageUploadField
                  existingImages={existingImages}
                  pendingFiles={pendingFiles}
                  onPendingChange={(files) => { setPendingFiles(files); if (files.length > 0) setImageError(null); }}
                  onDeleteExisting={onDeleteImage ? handleDeleteExisting : undefined}
                />
                {imageError && (
                  <Text size="xs" c="red">{imageError}</Text>
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
    </Modal>
  );
};

export default ProductFormDrawer;
