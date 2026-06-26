import React from 'react';
import {
  TextInput, Button, Stack,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';
import AuthLayout, { BackToLoginLink } from '../components/AuthLayout';

const schema = Yup.object({
  identifier: Yup.string().required('Email or phone number is required.'),
});

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (
    values: { identifier: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    try {
      await api.post('/auth/forgot-password', { identifier: values.identifier });
      sessionStorage.setItem('reset_identifier', values.identifier);
      await Swal.fire({
        icon: 'info',
        title: 'Code sent',
        text: 'A 6-digit code has been sent to your email or phone. It expires in 10 minutes.',
        confirmButtonColor: '#50C878',
      });
      navigate('/verify-code');
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        'Something went wrong. Please try again.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#50C878' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Password recovery"
      title="Find your account"
      subtitle="Enter the email address or phone number attached to your staff profile."
      activeStep="identify"
      footer={<BackToLoginLink />}
    >
      <Formik
        initialValues={{ identifier: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <Stack gap="md">
              <Field name="identifier">
                {({ field, meta }: FieldProps) => (
                  <TextInput
                    {...field}
                    className="auth-input"
                    label="Email or phone number"
                    placeholder="you@example.com or +233..."
                    autoComplete="username"
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Button type="submit" fullWidth loading={isSubmitting} className="auth-button">
                Send reset code
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
