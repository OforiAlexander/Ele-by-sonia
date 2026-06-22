import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Paper, Title, Text, TextInput, PasswordInput,
  Button, Anchor, Stack, Group,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';
import { useAuth } from '@client/common/context/AuthContext';
import RecaptchaWidget from '@client/common/components/RecaptchaWidget';

const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY ?? '';

const schema = Yup.object({
  email: Yup.string().email('Enter a valid email address.').required('Email is required.'),
  password: Yup.string().required('Password is required.'),
});

const LoginPage: React.FC = () => {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
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
    if (!recaptchaToken) {
      setRecaptchaError('Please complete the reCAPTCHA.');
      setSubmitting(false);
      return;
    }
    setRecaptchaError('');

    try {
      const res = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
        recaptchaToken,
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
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <Paper
        shadow="sm"
        radius="md"
        p="xl"
        style={{ width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF' }}
      >
        <Stack gap="xs" mb="lg">
          <Title order={2} style={{ color: '#1a1a1a', fontSize: '1.25rem' }}>
            Elegance by Sconia
          </Title>
          <Text c="dimmed" size="sm">
            Sign in to your store
          </Text>
        </Stack>

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
                      label="Email address"
                      placeholder="Enter email"
                      type="email"
                      autoComplete="email"
                      error={meta.touched && meta.error ? meta.error : undefined}
                      styles={{ input: { backgroundColor: '#F0F0F0' } }}
                    />
                  )}
                </Field>

                <Field name="password">
                  {({ field, meta }: FieldProps) => (
                    <PasswordInput
                      {...field}
                      label={
                        <Group justify="space-between" style={{ width: '100%' }}>
                          <span>Password</span>
                          <Anchor
                            component={Link}
                            to="/forgot-password"
                            size="xs"
                            style={{ color: '#50C878' }}
                          >
                            Forgot password?
                          </Anchor>
                        </Group>
                      }
                      placeholder="Enter password"
                      autoComplete="current-password"
                      error={meta.touched && meta.error ? meta.error : undefined}
                      styles={{ input: { backgroundColor: '#F0F0F0' } }}
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

                <Button
                  type="submit"
                  fullWidth
                  loading={isSubmitting}
                  style={{ backgroundColor: '#50C878', marginTop: '0.5rem' }}
                >
                  Sign In
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default LoginPage;
