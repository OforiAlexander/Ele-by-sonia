import React, { useEffect, useState } from 'react';
import {
  Text, TextInput, Button, Stack, Anchor, Group,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';
import AuthLayout, { BackToLoginLink } from '../components/AuthLayout';

const schema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, 'Enter the 6-digit code.')
    .required('Code is required.'),
});

const VerifyCodePage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_identifier') ?? '';
    if (!stored) {
      navigate('/forgot-password', { replace: true });
      return;
    }
    setIdentifier(stored);
  }, [navigate]);

  const handleSubmit = async (
    values: { code: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    try {
      const res = await api.post('/auth/verify-code', { identifier, code: values.code });
      const { resetToken } = res.data.data;
      sessionStorage.setItem('reset_token', resetToken);
      navigate('/set-password');
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        'Invalid or expired code. Please try again.';
      Swal.fire({ icon: 'error', title: 'Verification failed', text: msg, confirmButtonColor: '#50C878' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Password recovery"
      title="Enter the reset code"
      subtitle={(
        <>
          We sent a 6-digit code to <strong>{identifier || 'your account'}</strong>. It expires in 10 minutes.
        </>
      )}
      activeStep="verify"
      footer={(
        <Group justify="space-between" gap="sm">
          <Anchor component={Link} to="/forgot-password" className="auth-link" size="sm">
            Send a new code
          </Anchor>
          <BackToLoginLink />
        </Group>
      )}
    >
      <Formik
        initialValues={{ code: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <Stack gap="md">
              <Field name="code">
                {({ field, meta }: FieldProps) => (
                  <TextInput
                    {...field}
                    className="auth-input auth-code-input"
                    label="6-digit code"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Text size="sm" className="auth-help">
                For security, you can request a new code if this one expires or has already been used.
              </Text>

              <Button type="submit" fullWidth loading={isSubmitting} className="auth-button">
                Verify code
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
};

export default VerifyCodePage;
