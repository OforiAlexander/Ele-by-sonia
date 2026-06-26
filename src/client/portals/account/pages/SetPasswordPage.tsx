import React, { useEffect, useState } from 'react';
import {
  Text, PasswordInput, Button, Stack,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';
import AuthLayout, { BackToLoginLink } from '../components/AuthLayout';

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
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_token') ?? '';
    if (!stored) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    setToken(stored);
  }, [navigate]);

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
      navigate('/login', { replace: true });
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
    <AuthLayout
      eyebrow="Password recovery"
      title="Create a new password"
      subtitle="Choose a password that is easy for you to remember and difficult for others to guess."
      activeStep="password"
      footer={<BackToLoginLink />}
    >
      <Formik
        initialValues={{ newPassword: '', confirmPassword: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values }) => {
          const hasMinimumLength = values.newPassword.length >= 8;
          const passwordsMatch =
            values.confirmPassword.length > 0 && values.newPassword === values.confirmPassword;

          return (
            <Form className="auth-form">
              <Stack gap="md">
                <Field name="newPassword">
                  {({ field, meta }: FieldProps) => (
                    <PasswordInput
                      {...field}
                      className="auth-input"
                      label="New password"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      error={meta.touched && meta.error ? meta.error : undefined}
                    />
                  )}
                </Field>

                <Field name="confirmPassword">
                  {({ field, meta }: FieldProps) => (
                    <PasswordInput
                      {...field}
                      className="auth-input"
                      label="Confirm new password"
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      error={meta.touched && meta.error ? meta.error : undefined}
                    />
                  )}
                </Field>

                <Stack gap={4}>
                  <Text size="sm" c={hasMinimumLength ? 'green.7' : 'dimmed'}>
                    Minimum 8 characters
                  </Text>
                  <Text size="sm" c={passwordsMatch ? 'green.7' : 'dimmed'}>
                    Passwords match
                  </Text>
                </Stack>

                <Button type="submit" fullWidth loading={isSubmitting} className="auth-button">
                  Update password
                </Button>
              </Stack>
            </Form>
          );
        }}
      </Formik>
    </AuthLayout>
  );
};

export default SetPasswordPage;
