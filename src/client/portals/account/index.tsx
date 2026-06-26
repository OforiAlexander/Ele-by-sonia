import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@fontsource/inter/400.css';
import '@fontsource/space-grotesk/700.css';
import '@client/common/styles/global.scss';
import '@client/common/styles/auth.scss';
import { AuthProvider } from '@client/common/context/AuthContext';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyCodePage from './pages/VerifyCodePage';
import SetPasswordPage from './pages/SetPasswordPage';

const theme = {
  primaryColor: 'green' as const,
  colors: {
    // Forest-green scale — index 6 (#0A5C3F) is used by Mantine's filled Button
    green: [
      '#e6f0eb', '#c7dfcf', '#a4ccb3', '#7db896',
      '#55a378', '#2d8d5b', '#0A5C3F', '#084a33',
      '#063926', '#03261a',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md' as const,
  components: {
    TextInput: {
      defaultProps: { size: 'md' as const },
    },
    PasswordInput: {
      defaultProps: { size: 'md' as const },
    },
    Button: {
      defaultProps: { size: 'md' as const },
    },
    PinInput: {
      defaultProps: { size: 'lg' as const },
    },
  },
};

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter basename="/account">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-code" element={<VerifyCodePage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>,
);
