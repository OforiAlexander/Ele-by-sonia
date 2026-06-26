import React, { useEffect, useState } from 'react';
import { PinInput, Button, Stack, Text, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import api from '@client/common/api';
import AuthShell from '@client/common/components/AuthShell';
import { showError } from '@client/common/utils/swal';
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

const VerifyCodePage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_identifier') ?? '';
    if (!stored) {
      window.location.href = '/account/forgot-password';
      return;
    }
    setIdentifier(stored);
  }, []);

  const submit = async (value: string) => {
    if (value.length < 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-code', { identifier, code: value });
      sessionStorage.setItem('reset_token', res.data.data.resetToken);
      window.location.href = '/account/set-password';
    } catch (err: any) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ??
        err.response?.data?.message ??
        t(KEYS.auth.verify.errorFallback);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <p className="auth-eyebrow">{t(KEYS.auth.verify.eyebrow)}</p>
      <h1 className="auth-title">{t(KEYS.auth.verify.title)}</h1>
      <p className="auth-subtitle">
        {t(KEYS.auth.verify.subtitle)} <strong>{identifier}</strong>.
      </p>

      <Stack gap="md">
        <PinInput
          length={6}
          type="number"
          value={code}
          onChange={setCode}
          onComplete={submit}
          size="lg"
          error={!!error}
          oneTimeCode
        />

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Button fullWidth loading={loading} disabled={code.length < 6} mt={4} onClick={() => submit(code)}>
          {t(KEYS.auth.verify.submit)}
        </Button>

        <p className="auth-footer-text">
          {t(KEYS.auth.verify.footerText)}{' '}
          <Anchor component={Link} to="/forgot-password">
            {t(KEYS.auth.verify.footerLink)}
          </Anchor>
        </p>
      </Stack>
    </AuthShell>
  );
};

export default VerifyCodePage;
