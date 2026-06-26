import React from 'react';
import { Modal, Stack, NumberInput, Textarea, Button, Group, Text } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import type { ProductVariant } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface StockAddValues {
  quantity: number | '';
  note:     string;
}

interface Props {
  opened:   boolean;
  variant:  ProductVariant | null;
  onClose:  () => void;
  onSubmit: (variantId: string, quantity: number, note: string) => Promise<void>;
}

const schema = Yup.object({
  quantity: Yup.number().integer().positive('Quantity must be at least 1.').required('Quantity is required.'),
  note:     Yup.string(),
});

const initial: StockAddValues = { quantity: '', note: '' };

const StockAddModal: React.FC<Props> = ({ opened, variant, onClose, onSubmit }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={t(KEYS.variants.stock.addTitle)}
    size="sm"
    centered
  >
    {variant && (
      <Text size="sm" c="dimmed" mb="md">
        {variant.sku ?? variant.optionValues?.map((ov) => ov.value).join(' / ') ?? variant.id}
      </Text>
    )}
    <Formik
      key={variant?.id ?? 'none'}
      initialValues={initial}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        if (!variant) return;
        await onSubmit(variant.id, values.quantity as number, values.note);
        helpers.setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched, setFieldValue, values }) => (
        <Form>
          <Stack gap="md">
            <Field name="quantity">
              {({ field }: FieldProps) => (
                <NumberInput
                  label={t(KEYS.variants.stock.quantityLabel)}
                  value={field.value}
                  onChange={(v) => setFieldValue('quantity', v)}
                  min={1}
                  error={touched.quantity && errors.quantity}
                  required
                />
              )}
            </Field>

            <Field name="note">
              {({ field }: FieldProps) => (
                <Textarea
                  {...field}
                  label={t(KEYS.variants.stock.noteLabel)}
                  placeholder={t(KEYS.variants.stock.notePlaceholder)}
                  rows={2}
                />
              )}
            </Field>

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={onClose} disabled={isSubmitting}>
                {t(KEYS.variants.form.cancel)}
              </Button>
              <Button type="submit" loading={isSubmitting} color="green">
                {t(KEYS.variants.stock.submitAdd)}
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Formik>
  </Modal>
);

export default StockAddModal;
