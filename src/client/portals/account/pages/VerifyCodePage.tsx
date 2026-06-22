import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Title, Text, TextInput, Button, Stack, Anchor,
} from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '@client/common/api';

const schema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, 'Enter the 6-digit code.')
    .required('Code is required.'),
});

const VerifyCodePage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_identifier') ?? '';
    if (!stored) {
      window.location.href = '/account/forgot-password';
    }
    setIdentifier(stored);
  }, []);

  const handleSubmit = async (
    values: { code: string },
    { setSubmitting }: { setSubmitting: (b: boolean) => void },
  ) => {
    try {
      const res = await api.post('/auth/verify-code', { identifier, code: values.code });
      const { resetToken } = res.data.data;
      sessionStorage.setItem('reset_token', resetToken);
      window.location.href = '/account/set-password';
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
            Enter your code
          </Title>
          <Text c="dimmed" size="sm">
            We sent a 6-digit code to <strong>{identifier}</strong>. Enter it below.
          </Text>
        </Stack>

        <Formik
          initialValues={{ code: '' }}
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <Stack gap="md">
                <Field name="code">
                  {({ field, meta }: FieldProps) => (
                    <TextInput
                      {...field}
                      label="6-digit code"
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      error={meta.touched && meta.error ? meta.error : undefined}
                      styles={{ input: { backgroundColor: '#F0F0F0', letterSpacing: '0.25em' } }}
                    />
                  )}
                </Field>

                <Button
                  type="submit"
                  fullWidth
                  loading={isSubmitting}
                  style={{ backgroundColor: '#50C878' }}
                >
                  Verify Code
                </Button>

                <Text size="sm" ta="center">
                  <Anchor component={Link} to="/forgot-password" style={{ color: '#50C878' }}>
                    Resend code
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

export default VerifyCodePage;
