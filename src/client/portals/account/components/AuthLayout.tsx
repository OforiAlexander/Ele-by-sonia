import React from 'react';
import { Anchor, Box, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: React.ReactNode;
  activeStep?: 'signin' | 'identify' | 'verify' | 'password';
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const steps = [
  { key: 'identify', label: 'Identify' },
  { key: 'verify', label: 'Verify' },
  { key: 'password', label: 'Reset' },
] as const;

const AuthLayout: React.FC<AuthLayoutProps> = ({
  eyebrow,
  title,
  subtitle,
  activeStep = 'signin',
  children,
  footer,
}) => {
  const showSteps = activeStep !== 'signin';

  return (
    <Box className="auth-page">
      <Box className="auth-shell">
        <Box className="auth-brand-panel" aria-hidden="true">
          <Stack justify="space-between" h="100%">
            <Box>
              <Box className="auth-mark">ES</Box>
              <Title order={1} className="auth-brand-title">
                Elegance by Sconia
              </Title>
              <Text className="auth-brand-copy">
                Secure access for inventory, sales, staff, and store operations.
              </Text>
            </Box>

            <Box className="auth-preview">
              <Group justify="space-between" mb="md">
                <Text className="auth-preview-label">Today</Text>
                <Text className="auth-preview-pill">Protected</Text>
              </Group>
              <Stack gap="sm">
                <Box className="auth-preview-row auth-preview-row--wide" />
                <Box className="auth-preview-row" />
                <Box className="auth-preview-row auth-preview-row--short" />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Paper className="auth-card" shadow="xl" radius={8}>
          <Stack gap="lg">
            <Stack gap={6}>
              <Text className="auth-eyebrow">{eyebrow}</Text>
              <Title order={2} className="auth-title">
                {title}
              </Title>
              <Text className="auth-subtitle">{subtitle}</Text>
            </Stack>

            {showSteps && (
              <Group className="auth-steps" gap={8} wrap="nowrap">
                {steps.map((step, index) => {
                  const currentIndex = steps.findIndex((item) => item.key === activeStep);
                  const stateClass = index < currentIndex
                    ? 'is-complete'
                    : index === currentIndex
                      ? 'is-active'
                      : '';

                  return (
                    <React.Fragment key={step.key}>
                      {index > 0 && <Box className={`auth-step-line ${index <= currentIndex ? 'is-complete' : ''}`} />}
                      <Box className={`auth-step ${stateClass}`}>
                        <span>{index + 1}</span>
                        <Text>{step.label}</Text>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Group>
            )}

            {children}

            {footer && <Box className="auth-footer">{footer}</Box>}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export const BackToLoginLink: React.FC = () => (
  <Text size="sm" ta="center">
    <Anchor component={Link} to="/login" className="auth-link">
      Back to sign in
    </Anchor>
  </Text>
);

export default AuthLayout;
