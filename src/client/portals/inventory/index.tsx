import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/space-grotesk/700.css';
import '../../common/styles/portal.scss';
import { AuthProvider, useAuth } from '../../common/context/AuthContext';
import AppLoader from './components/AppLoader';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

const DashboardPage     = React.lazy(() => import('./pages/DashboardPage'));
const ProductsPage      = React.lazy(() => import('./pages/ProductsPage'));
const PosPage           = React.lazy(() => import('./pages/PosPage'));
const OrdersPage        = React.lazy(() => import('./pages/OrdersPage'));
const ReportsPage       = React.lazy(() => import('./pages/ReportsPage'));
const StaffPage         = React.lazy(() => import('./pages/StaffPage'));
const SettingsPage      = React.lazy(() => import('./pages/SettingsPage'));
const DeliveryZonesPage = React.lazy(() => import('./pages/DeliveryZonesPage'));
const RolesPage         = React.lazy(() => import('./pages/RolesPage'));
const VariantsPage      = React.lazy(() => import('./pages/VariantsPage'));

const theme = {
  primaryColor: 'green' as const,
  colors: {
    green: [
      '#e8f8ef', '#c5edda', '#9fe0c3', '#74d3ac',
      '#50C878', '#3db366', '#2d9e52', '#1e8a3e',
      '#0f762b', '#006219',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  fontFamily: 'IBM Plex Sans, sans-serif',
};

const Layout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />;

  if (!user) {
    window.location.href = '/account/';
    return null;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Suspense fallback={<AppLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <MantineProvider theme={theme}>
    <AuthProvider>
      <BrowserRouter basename="/inventory">
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products"  element={<ProductsPage />} />
            <Route path="pos"       element={<PosPage />} />
            <Route path="orders"    element={<OrdersPage />} />
            <Route path="reports"   element={<ReportsPage />} />
            <Route path="staff"     element={<StaffPage />} />
            <Route path="settings"  element={<SettingsPage />} />
            <Route path="delivery"  element={<DeliveryZonesPage />} />
            <Route path="roles"     element={<RolesPage />} />
            <Route path="variants"  element={<VariantsPage />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </MantineProvider>
);

const container = document.getElementById('root')!;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
