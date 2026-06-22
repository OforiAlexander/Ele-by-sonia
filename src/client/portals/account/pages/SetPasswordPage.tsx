import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Title, Text, PasswordInput, Button, Stack,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import api from '@client/common/api';

const schema = Yup.object({
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters.')
    .required('New password is required.'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords do not match.')
    .required('Please confirm your password.'),
});

const SetPasswordPage: React.FC = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_token') ?? '';
    if (!stored) {
      window.location.href = '/account/forgot-password';
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
      await Swal.fire({
        icon: 'success',
        title: 'Password updated',
        text: 'Your password has been changed. Sign in with your new password.',
        confirmButtonColor: '#50C878',
      });
      window.location.href = '/account/login';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        'Could not update password. The reset link may have expired.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#50C878' });
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
            Set a new password
          </Title>
          <Text c="dimmed" size="sm">
            Choose a strong password with at least 8 characters.
          </Text>
        </Stack>

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
                      label="New password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      error={meta.touched && meta.error ? meta.error : undefined}
                      styles={{ input: { backgroundColor: '#F0F0F0' } }}
                    />
                  )}
                </Field>

                <Field name="confirmPassword">
                  {({ field, meta }: FieldProps) => (
                    <PasswordInput
                      {...field}
                      label="Confirm new password"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      error={meta.touched && meta.error ? meta.error : undefined}
                      styles={{ input: { backgroundColor: '#F0F0F0' } }}
                    />
                  )}
                </Field>

                <Button
                  type="submit"
                  fullWidth
                  loading={isSubmitting}
                  style={{ backgroundColor: '#50C878' }}
                >
                  Update Password
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default SetPasswordPage;
