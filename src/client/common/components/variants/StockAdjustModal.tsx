import React from 'react';
import { Modal, Stack, NumberInput, Textarea, Button, Group, Text } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import type { ProductVariant } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface StockAdjustValues {
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
  quantity: Yup.number()
    .integer()
    .not([0], 'Quantity cannot be zero.')
    .required('Quantity is required.'),
  note: Yup.string().required('Note is required for adjustments.'),
});

const initial: StockAdjustValues = { quantity: '', note: '' };

const StockAdjustModal: React.FC<Props> = ({ opened, variant, onClose, onSubmit }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={t(KEYS.variants.stock.adjustTitle)}
    size="sm"
    centered
  >
    {variant && (
      <Text size="sm" c="dimmed" mb="md">
        {t(KEYS.variants.table.stock)}: <strong>{variant.stock}</strong>
        {' · '}
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
      {({ isSubmitting, errors, touched, setFieldValue }) => (
        <Form>
          <Stack gap="md">
            <Field name="quantity">
              {({ field }: FieldProps) => (
                <NumberInput
                  label={t(KEYS.variants.stock.quantityLabel)}
                  description="Use a negative value to remove stock (e.g. −3 for damaged goods)."
                  value={field.value}
                  onChange={(v) => setFieldValue('quantity', v)}
                  error={touched.quantity && errors.quantity}
                  allowNegative
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
                  error={touched.note && errors.note}
                  required
                />
              )}
            </Field>

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={onClose} disabled={isSubmitting}>
                {t(KEYS.variants.form.cancel)}
              </Button>
              <Button type="submit" loading={isSubmitting} color="orange">
                {t(KEYS.variants.stock.submitAdjust)}
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Formik>
  </Modal>
);

export default StockAdjustModal;
