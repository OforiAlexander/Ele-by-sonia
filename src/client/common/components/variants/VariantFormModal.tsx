import React from 'react';
import { Modal, Stack, TextInput, NumberInput, Button, Group, Text, Checkbox } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import type { ProductOptionType } from '../../types';
import { t } from '../../translations';
import { KEYS } from '../../keys';

interface VariantFormValues {
  sku:                 string;
  cost_price:          number | '';
  selling_price:       number | '';
  low_stock_threshold: number;
  selectedValueIds:    string[];
}

interface Props {
  opened:      boolean;
  productId:   string;
  optionTypes: ProductOptionType[];
  onClose:     () => void;
  onSubmit:    (values: VariantFormValues) => Promise<void>;
}

const schema = Yup.object({
  sku:                 Yup.string(),
  cost_price:          Yup.number().positive(t(KEYS.variants.form.validation.costRequired)).required(t(KEYS.variants.form.validation.costRequired)),
  selling_price:       Yup.number().positive(t(KEYS.variants.form.validation.sellRequired)).required(t(KEYS.variants.form.validation.sellRequired)),
  low_stock_threshold: Yup.number().integer().min(0),
  selectedValueIds:    Yup.array().of(Yup.string()),
});

const initial: VariantFormValues = {
  sku:                 '',
  cost_price:          '',
  selling_price:       '',
  low_stock_threshold: 0,
  selectedValueIds:    [],
};

const VariantFormModal: React.FC<Props> = ({ opened, optionTypes, onClose, onSubmit }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={t(KEYS.variants.form.addTitle)}
    size="md"
    centered
  >
    <Formik
      key={opened ? 'open' : 'closed'}
      initialValues={initial}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        await onSubmit(values);
        helpers.setSubmitting(false);
      }}
    >
      {({ isSubmitting, errors, touched, values, setFieldValue }) => (
        <Form>
          <Stack gap="md">
            <Field name="sku">
              {({ field }: FieldProps) => (
                <TextInput
                  {...field}
                  label={t(KEYS.variants.form.skuLabel)}
                  placeholder={t(KEYS.variants.form.skuPlaceholder)}
                />
              )}
            </Field>

            <Group grow>
              <Field name="cost_price">
                {({ field }: FieldProps) => (
                  <NumberInput
                    label={t(KEYS.variants.form.costLabel)}
                    value={field.value}
                    onChange={(v) => setFieldValue('cost_price', v)}
                    min={0.01}
                    decimalScale={2}
                    error={touched.cost_price && errors.cost_price}
                    required
                  />
                )}
              </Field>
              <Field name="selling_price">
                {({ field }: FieldProps) => (
                  <NumberInput
                    label={t(KEYS.variants.form.sellLabel)}
                    value={field.value}
                    onChange={(v) => setFieldValue('selling_price', v)}
                    min={0.01}
                    decimalScale={2}
                    error={touched.selling_price && errors.selling_price}
                    required
                  />
                )}
              </Field>
            </Group>

            <Field name="low_stock_threshold">
              {({ field }: FieldProps) => (
                <NumberInput
                  label={t(KEYS.variants.form.thresholdLabel)}
                  value={field.value}
                  onChange={(v) => setFieldValue('low_stock_threshold', Number(v) || 0)}
                  min={0}
                />
              )}
            </Field>

            {optionTypes.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>{t(KEYS.variants.form.optionsLabel)}</Text>
                {optionTypes.map((ot) => (
                  <Stack key={ot.id} gap={4}>
                    <Text size="xs" c="dimmed">{ot.name}</Text>
                    <Group gap={8} wrap="wrap">
                      {ot.values.map((val) => (
                        <Checkbox
                          key={val.id}
                          label={val.value}
                          size="xs"
                          checked={values.selectedValueIds.includes(val.id)}
                          onChange={(e) => {
                            const next = e.currentTarget.checked
                              ? [...values.selectedValueIds, val.id]
                              : values.selectedValueIds.filter((id) => id !== val.id);
                            setFieldValue('selectedValueIds', next);
                          }}
                        />
                      ))}
                    </Group>
                  </Stack>
                ))}
              </Stack>
            )}

            <Group justify="flex-end" mt="sm">
              <Button variant="subtle" color="gray" onClick={onClose} disabled={isSubmitting}>
                {t(KEYS.variants.form.cancel)}
              </Button>
              <Button type="submit" loading={isSubmitting} color="green">
                {t(KEYS.variants.form.submit)}
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Formik>
  </Modal>
);

export default VariantFormModal;
