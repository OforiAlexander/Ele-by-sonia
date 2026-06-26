import React from 'react';
import { Box, Text } from '@mantine/core';
import RecaptchaWidget from './RecaptchaWidget';

const SITE_KEY = process.env.RECAPTCHA_SITE_KEY ?? '';

interface Props {
  onToken: (token: string) => void;
  onExpired: () => void;
  error?: string;
}

const RecaptchaField: React.FC<Props> = ({ onToken, onExpired, error }) => {
  if (!SITE_KEY) return null;
  return (
    <Box>
      <RecaptchaWidget siteKey={SITE_KEY} onToken={onToken} onExpired={onExpired} />
      {error && (
        <Text size="xs" c="red" mt={4}>
          {error}
        </Text>
      )}
    </Box>
  );
};

export default RecaptchaField;
