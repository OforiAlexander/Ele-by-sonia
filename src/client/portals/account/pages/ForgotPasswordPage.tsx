import React from 'react';
import { TextInput, Button, Stack, Anchor } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import api from '@client/common/api';
import AuthShell from '@client/common/components/AuthShell';
import { showError, showInfo } from '@client/common/utils/swal';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const schema = Yup.object({
  identifier: Yup.string().required(t(KEYS.auth.validation.identifierRequired)),
});

const ForgotPasswordPage: React.FC = () => {
  const handleSubmit = async (
    values: { identifier: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    try {
      await api.post('/auth/forgot-password', { identifier: values.identifier });
      sessionStorage.setItem('reset_identifier', values.identifier);
      await showInfo(t(KEYS.auth.forgot.sentTitle), t(KEYS.auth.forgot.sentText));
      window.location.href = '/account/verify-code';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        t(KEYS.auth.forgot.errorFallback);
      showError(t(KEYS.auth.forgot.errorTitle), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <p className="auth-eyebrow">{t(KEYS.auth.forgot.eyebrow)}</p>
      <h1 className="auth-title">{t(KEYS.auth.forgot.title)}</h1>
      <p className="auth-subtitle">{t(KEYS.auth.forgot.subtitle)}</p>

      <Formik
        initialValues={{ identifier: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <Stack gap="md">
              <Field name="identifier">
                {({ field, meta }: FieldProps) => (
                  <TextInput
                    {...field}
                    label={t(KEYS.auth.forgot.label)}
                    placeholder={t(KEYS.auth.forgot.placeholder)}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Button type="submit" fullWidth loading={isSubmitting} mt={4}>
                {t(KEYS.auth.forgot.submit)}
              </Button>

              <p className="auth-footer-text">
                {t(KEYS.auth.forgot.footerText)}{' '}
                <Anchor component={Link} to="/login">
                  {t(KEYS.auth.forgot.footerLink)}
                </Anchor>
              </p>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
