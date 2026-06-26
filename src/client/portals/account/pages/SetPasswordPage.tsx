import React, { useEffect, useState } from 'react';
import { PasswordInput, Button, Stack } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import api from '@client/common/api';
import AuthShell from '@client/common/components/AuthShell';
import { showError, showSuccess } from '@client/common/utils/swal';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const schema = Yup.object({
  newPassword: Yup.string()
    .min(8, t(KEYS.auth.validation.passwordMin))
    .required(t(KEYS.auth.validation.passwordRequired)),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], t(KEYS.auth.validation.passwordMismatch))
    .required(t(KEYS.auth.validation.confirmRequired)),
});

const SetPasswordPage: React.FC = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_token') ?? '';
    if (!stored) {
      window.location.href = '/account/forgot-password';
      return;
    }
    setToken(stored);
  }, []);

  const handleSubmit = async (
    values: { newPassword: string; confirmPassword: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword: values.newPassword });
      sessionStorage.removeItem('reset_identifier');
      sessionStorage.removeItem('reset_token');
      await showSuccess(t(KEYS.auth.setPassword.successTitle), t(KEYS.auth.setPassword.successText));
      window.location.href = '/account/login';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        t(KEYS.auth.setPassword.errorFallback);
      showError(t(KEYS.auth.setPassword.errorTitle), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <p className="auth-eyebrow">{t(KEYS.auth.setPassword.eyebrow)}</p>
      <h1 className="auth-title">{t(KEYS.auth.setPassword.title)}</h1>
      <p className="auth-subtitle">{t(KEYS.auth.setPassword.subtitle)}</p>

      <Formik
        initialValues={{ newPassword: '', confirmPassword: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <Stack gap="md">
              <Field name="newPassword">
                {({ field, meta }: FieldProps) => (
                  <PasswordInput
                    {...field}
                    label={t(KEYS.auth.setPassword.newLabel)}
                    placeholder={t(KEYS.auth.setPassword.newPlaceholder)}
                    autoComplete="new-password"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Field name="confirmPassword">
                {({ field, meta }: FieldProps) => (
                  <PasswordInput
                    {...field}
                    label={t(KEYS.auth.setPassword.confirmLabel)}
                    placeholder={t(KEYS.auth.setPassword.confirmPlaceholder)}
                    autoComplete="new-password"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Button type="submit" fullWidth loading={isSubmitting} mt={4}>
                {t(KEYS.auth.setPassword.submit)}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthShell>
  );
};

export default SetPasswordPage;
