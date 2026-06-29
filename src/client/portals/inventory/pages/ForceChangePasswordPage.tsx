import React from 'react';
import { Modal, Stack, Text, PasswordInput, Button, Box } from '@mantine/core';
import { Formik, Form, Field, FieldProps } from 'formik';
import * as Yup from 'yup';
import api from '../../../common/api';
import { useAuth } from '../../../common/context/AuthContext';
import { showError } from '../../../common/utils/swal';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';

const schema = Yup.object({
    currentPassword: Yup.string().required(t(KEYS.forceChangePassword.validation.currentRequired)),
    newPassword:     Yup.string().min(8, t(KEYS.forceChangePassword.validation.newMin)).required(t(KEYS.forceChangePassword.validation.newMin)),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], t(KEYS.forceChangePassword.validation.confirmMismatch))
        .required(t(KEYS.forceChangePassword.validation.confirmMismatch)),
});

const ForceChangePasswordPage: React.FC = () => {
    const { logout } = useAuth();

    const handleSubmit = async (
        values: { currentPassword: string; newPassword: string; confirmPassword: string },
        { setSubmitting }: { setSubmitting: (b: boolean) => void },
    ) => {
        try {
            await api.post('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword:     values.newPassword,
            });

            import('sweetalert2').then(({ default: Swal }) => {
                Swal.fire({
                    icon: 'success',
                    title: t(KEYS.forceChangePassword.successTitle),
                    text: t(KEYS.forceChangePassword.successText),
                    confirmButtonColor: '#50C878',
                    allowOutsideClick: false,
                }).then(() => {
                    logout().catch(() => {
                        window.location.href = '/account/';
                    });
                });
            });
        } catch (err: any) {
            const msg: string | undefined = err?.response?.data?.message;
            showError(
                t(KEYS.forceChangePassword.errorTitle),
                msg ?? t(KEYS.forceChangePassword.errorFallback),
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            opened
            onClose={() => undefined}
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
            overlayProps={{ backgroundOpacity: 0.85 }}
            size="sm"
            centered
            title={null}
        >
            <Box p="sm">
                <Stack gap="xs" mb="lg">
                    <Text fw={700} size="lg">{t(KEYS.forceChangePassword.title)}</Text>
                    <Text size="sm" c="dimmed">{t(KEYS.forceChangePassword.subtitle)}</Text>
                </Stack>

                <Formik
                    initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
                    validationSchema={schema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <Stack gap="md">
                                <Field name="currentPassword">
                                    {({ field, meta }: FieldProps) => (
                                        <PasswordInput
                                            {...field}
                                            label={t(KEYS.forceChangePassword.currentLabel)}
                                            placeholder={t(KEYS.forceChangePassword.currentPlaceholder)}
                                            error={meta.touched && meta.error ? meta.error : undefined}
                                            autoComplete="current-password"
                                        />
                                    )}
                                </Field>

                                <Field name="newPassword">
                                    {({ field, meta }: FieldProps) => (
                                        <PasswordInput
                                            {...field}
                                            label={t(KEYS.forceChangePassword.newLabel)}
                                            placeholder={t(KEYS.forceChangePassword.newPlaceholder)}
                                            error={meta.touched && meta.error ? meta.error : undefined}
                                            autoComplete="new-password"
                                        />
                                    )}
                                </Field>

                                <Field name="confirmPassword">
                                    {({ field, meta }: FieldProps) => (
                                        <PasswordInput
                                            {...field}
                                            label={t(KEYS.forceChangePassword.confirmLabel)}
                                            placeholder={t(KEYS.forceChangePassword.confirmPlaceholder)}
                                            error={meta.touched && meta.error ? meta.error : undefined}
                                            autoComplete="new-password"
                                        />
                                    )}
                                </Field>

                                <Button
                                    type="submit"
                                    color="green"
                                    fullWidth
                                    mt="xs"
                                    loading={isSubmitting}
                                >
                                    {t(KEYS.forceChangePassword.submit)}
                                </Button>
                            </Stack>
                        </Form>
                    )}
                </Formik>
            </Box>
        </Modal>
    );
};

export default ForceChangePasswordPage;
