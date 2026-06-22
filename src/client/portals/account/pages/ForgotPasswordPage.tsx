import React from 'react';
import {
  Box, Paper, Title, Text, TextInput, Button, Stack, Anchor,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';

const schema = Yup.object({
  identifier: Yup.string().required('Email or phone number is required.'),
});

const ForgotPasswordPage: React.FC = () => {
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
      window.location.href = '/account/verify-code';
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
            Forgot your password?
          </Title>
          <Text c="dimmed" size="sm">
            Enter your email address or phone number and we'll send you a reset code.
          </Text>
        </Stack>

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
                      label="Email or phone number"
                      placeholder="e.g. you@example.com or +233..."
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
                  Send Reset Code
                </Button>

                <Text size="sm" ta="center">
                  <Anchor component={Link} to="/login" style={{ color: '#50C878' }}>
                    Back to sign in
                  </Anchor>
                </Text>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
};

export default ForgotPasswordPage;
