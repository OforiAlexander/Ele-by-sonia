import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@client/common/styles/global.scss';
import './account.scss';
import { AuthProvider } from '@client/common/context/AuthContext';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyCodePage from './pages/VerifyCodePage';
import SetPasswordPage from './pages/SetPasswordPage';

const theme = {
  primaryColor: 'green' as const,
  colors: {
    green: [
      '#e8f8ef', '#c5edda', '#9fe0c3', '#74d3ac',
      '#50C878', '#3db366', '#2d9e52', '#1e8a3e',
      '#0f762b', '#006219',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'Inter, sans-serif',
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
