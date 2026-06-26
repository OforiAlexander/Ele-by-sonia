import React, { useEffect, useState } from 'react';
import {
  Box, Text, TextInput, PasswordInput,
  Button, Anchor, Stack, Group,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';
import { useAuth } from '@client/common/context/AuthContext';
import RecaptchaWidget from '@client/common/components/RecaptchaWidget';
import AuthLayout from '../components/AuthLayout';

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY ?? '';

const schema = Yup.object({
  email: Yup.string().email('Enter a valid email address.').required('Email is required.'),
  password: Yup.string().required('Password is required.'),
});

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
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setRecaptchaError('Please complete the reCAPTCHA.');
      setSubmitting(false);
      return;
    }
    setRecaptchaError('');

    try {
      const res = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
        recaptchaToken: RECAPTCHA_SITE_KEY ? recaptchaToken : 'recaptcha-disabled',
      });
      const loggedInUser = res.data.data;
      setUser(loggedInUser);
      window.location.href = '/inventory/';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        'Login failed. Check your credentials and try again.';
      Swal.fire({ icon: 'error', title: 'Sign in failed', text: msg, confirmButtonColor: '#50C878' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Secure staff access"
      title="Sign in to your workspace"
      subtitle="Use your staff account to manage inventory, sales, reports, and store settings."
    >
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <Stack gap="md">
              <Field name="email">
                {({ field, meta }: FieldProps) => (
                  <TextInput
                    {...field}
                    className="auth-input"
                    label="Email address"
                    placeholder="staff@example.com"
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
                    className="auth-input"
                    label={
                      <Group justify="space-between" style={{ width: '100%' }} wrap="nowrap">
                        <span>Password</span>
                        <Anchor component={Link} to="/forgot-password" size="xs" className="auth-link">
                          Forgot password?
                        </Anchor>
                      </Group>
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              {RECAPTCHA_SITE_KEY && (
                <Box>
                  <RecaptchaWidget
                    siteKey={RECAPTCHA_SITE_KEY}
                    onToken={setRecaptchaToken}
                    onExpired={() => setRecaptchaToken('')}
                  />
                  {recaptchaError && (
                    <Text size="xs" c="red" mt={4}>
                      {recaptchaError}
                    </Text>
                  )}
                </Box>
              )}

              <Button type="submit" fullWidth loading={isSubmitting} className="auth-button">
                Sign in
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
};

export default LoginPage;
