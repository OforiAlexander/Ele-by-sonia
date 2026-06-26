import React, { useEffect, useState } from 'react';
import { TextInput, PasswordInput, Button, Stack, Anchor, Group } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import api from '@client/common/api';
import { useAuth } from '@client/common/context/AuthContext';
import AuthShell from '@client/common/components/AuthShell';
import RecaptchaField from '@client/common/components/RecaptchaField';
import { showError } from '@client/common/utils/swal';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const schema = Yup.object({
  email: Yup.string()
    .email(t(KEYS.auth.validation.emailInvalid))
    .required(t(KEYS.auth.validation.emailRequired)),
  password: Yup.string().required(t(KEYS.auth.validation.passwordRequired)),
});

const RECAPTCHA_ENABLED = Boolean(process.env.RECAPTCHA_SITE_KEY);

const LoginPage: React.FC = () => {
  const { user, loading, setUser } = useAuth();
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      window.location.href = '/inventory/';
    }
  }, [user, loading]);

  const handleSubmit = async (
    values: { email: string; password: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    if (RECAPTCHA_ENABLED && !recaptchaToken) {
      setRecaptchaError(t(KEYS.auth.login.recaptchaError));
      setSubmitting(false);
      return;
    }
    setRecaptchaError('');

    try {
      const res = await api.post('/auth/login', { ...values, recaptchaToken });
      setUser(res.data.data);
      window.location.href = '/inventory/';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        t(KEYS.auth.login.errorFallback);
      showError(t(KEYS.auth.login.errorTitle), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <p className="auth-eyebrow">{t(KEYS.auth.login.eyebrow)}</p>
      <h1 className="auth-title">{t(KEYS.auth.login.title)}</h1>
      <p className="auth-subtitle">{t(KEYS.auth.login.subtitle)}</p>

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form>
            <Stack gap="md">
              <Field name="email">
                {({ field, meta }: FieldProps) => (
                  <TextInput
                    {...field}
                    label={t(KEYS.auth.login.emailLabel)}
                    placeholder={t(KEYS.auth.login.emailPlaceholder)}
                    type="email"
                    autoComplete="email"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Field name="password">
                {({ field, meta }: FieldProps) => (
                  <PasswordInput
                    {...field}
                    label={
                      <Group justify="space-between" style={{ width: '100%' }}>
                        <span>{t(KEYS.auth.login.passwordLabel)}</span>
                        <Anchor component={Link} to="/forgot-password" className="auth-link">
                          {t(KEYS.auth.login.forgotLink)}
                        </Anchor>
                      </Group>
                    }
                    placeholder={t(KEYS.auth.login.passwordPlaceholder)}
                    autoComplete="current-password"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <RecaptchaField
                onToken={setRecaptchaToken}
                onExpired={() => setRecaptchaToken('')}
                error={recaptchaError}
              />

              <Button type="submit" fullWidth loading={isSubmitting} mt={4}>
                {t(KEYS.auth.login.submit)}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthShell>
  );
};

export default LoginPage;
