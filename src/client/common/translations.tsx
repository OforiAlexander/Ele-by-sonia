import { KEYS } from './keys';

const translations: Record<string, string> = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  [KEYS.dashboard.title]:                 'Dashboard',
  [KEYS.dashboard.subtitle]:              'Key trends and business insights.',
  [KEYS.dashboard.kpi.totalProducts]:     'Total Products',
  [KEYS.dashboard.kpi.totalProductsSub]:  'Active in catalogue',
  [KEYS.dashboard.kpi.inventoryValue]:    'Inventory Value',
  [KEYS.dashboard.kpi.inventoryValueSub]: 'Cost price × stock',
  [KEYS.dashboard.kpi.totalSales]:        'Total Sales',
  [KEYS.dashboard.kpi.totalSalesSub]:     'Annual revenue',
  [KEYS.dashboard.kpi.lowStock]:          'Low Stock',
  [KEYS.dashboard.kpi.lowStockSub]:       'Needs attention',
  [KEYS.dashboard.kpi.outOfStock]:        'Out of Stock',
  [KEYS.dashboard.kpi.outOfStockSub]:     'Restock soon',
  [KEYS.dashboard.kpi.topSellingItem]:    'Top Selling Item',
  [KEYS.dashboard.kpi.topSellingItemSub]: 'Best seller this year',
  [KEYS.dashboard.chart.salesTrend]:      'Sales Trend',
  [KEYS.dashboard.topItems.title]:        'Top Selling Items',
  [KEYS.dashboard.topItems.empty]:        'No sales data yet.',
  [KEYS.dashboard.stockHealth.title]:     'Stock Health',
  [KEYS.dashboard.stockHealth.healthy]:   'Healthy',
  [KEYS.dashboard.stockHealth.lowStock]:  'Low stock',
  [KEYS.dashboard.stockHealth.outOfStock]:'Out of stock',
  [KEYS.dashboard.categories.title]:      'Purchases by Category',
  [KEYS.dashboard.categories.empty]:      'No category data yet.',

  // ── Navigation ────────────────────────────────────────────────────────────
  [KEYS.nav.dashboard]: 'Dashboard',
  [KEYS.nav.inventory]: 'Inventory',
  [KEYS.nav.sales]:     'Sales',
  [KEYS.nav.orders]:    'Orders',
  [KEYS.nav.reports]:   'Reports',
  [KEYS.nav.staff]:     'Staff',
  [KEYS.nav.settings]:  'Settings',
  [KEYS.nav.logout]:             'Logout',
  [KEYS.nav.logoutConfirmTitle]: 'Log out?',
  [KEYS.nav.logoutConfirmText]:  'You will need to sign in again to access the system.',

  // ── Common ────────────────────────────────────────────────────────────────
  [KEYS.common.loading]:          'Loading…',
  [KEYS.common.loadingDashboard]: 'Loading dashboard…',
  [KEYS.common.noData]:           '—',
  [KEYS.common.error]:            'Error',

  // ── Auth brand panel ──────────────────────────────────────────────────────
  [KEYS.auth.brand.headline]:       'Run your boutique.',
  [KEYS.auth.brand.headlineAccent]: 'Know your stock.',
  [KEYS.auth.brand.sub]:            'The complete inventory and POS system built for fashion retail in Ghana.',
  [KEYS.auth.brand.bullet1]:        'Track thousands of pieces by size, colour, and style',
  [KEYS.auth.brand.bullet2]:        'POS sales and stock update in the same transaction',
  [KEYS.auth.brand.bullet3]:        'Low-stock alerts before you sell out',
  [KEYS.auth.brand.quote]:          '“Designed for fashion retail in Ghana, built for the way you actually work.”',
  [KEYS.auth.brand.quoteAttr]:      'Elegance by Sconia',

  // ── Login page ────────────────────────────────────────────────────────────
  [KEYS.auth.login.eyebrow]:             'Welcome back',
  [KEYS.auth.login.title]:               'Sign in',
  [KEYS.auth.login.subtitle]:            'Enter your details to access the portal.',
  [KEYS.auth.login.emailLabel]:          'Email address',
  [KEYS.auth.login.emailPlaceholder]:    'you@yourstore.com',
  [KEYS.auth.login.passwordLabel]:       'Password',
  [KEYS.auth.login.passwordPlaceholder]: 'Enter your password',
  [KEYS.auth.login.forgotLink]:          'Forgot password?',
  [KEYS.auth.login.submit]:              'Sign in',
  [KEYS.auth.login.recaptchaError]:      'Please complete the reCAPTCHA.',
  [KEYS.auth.login.errorTitle]:          'Sign in failed',
  [KEYS.auth.login.errorFallback]:       'Login failed. Check your credentials and try again.',

  // ── Forgot password page ──────────────────────────────────────────────────
  [KEYS.auth.forgot.eyebrow]:       'Account access',
  [KEYS.auth.forgot.title]:         'Reset your password',
  [KEYS.auth.forgot.subtitle]:      "Enter your email or phone number and we’ll send you a reset code.",
  [KEYS.auth.forgot.label]:         'Email or phone number',
  [KEYS.auth.forgot.placeholder]:   'e.g. you@example.com or +233…',
  [KEYS.auth.forgot.submit]:        'Send reset code',
  [KEYS.auth.forgot.footerText]:    'Remember your password?',
  [KEYS.auth.forgot.footerLink]:    'Sign in',
  [KEYS.auth.forgot.sentTitle]:     'Code sent',
  [KEYS.auth.forgot.sentText]:      'A 6-digit code has been sent to your email or phone. It expires in 10 minutes.',
  [KEYS.auth.forgot.errorTitle]:    'Error',
  [KEYS.auth.forgot.errorFallback]: 'Something went wrong. Please try again.',

  // ── Verify code page ──────────────────────────────────────────────────────
  [KEYS.auth.verify.eyebrow]:       'Verification',
  [KEYS.auth.verify.title]:         'Enter your code',
  [KEYS.auth.verify.subtitle]:      'We sent a 6-digit code to',
  [KEYS.auth.verify.submit]:        'Verify code',
  [KEYS.auth.verify.footerText]:    "Didn’t receive a code?",
  [KEYS.auth.verify.footerLink]:    'Resend',
  [KEYS.auth.verify.errorFallback]: 'Invalid or expired code. Please try again.',

  // ── Set password page ─────────────────────────────────────────────────────
  [KEYS.auth.setPassword.eyebrow]:            'Almost done',
  [KEYS.auth.setPassword.title]:              'Create a new password',
  [KEYS.auth.setPassword.subtitle]:           'Choose something strong — at least 8 characters.',
  [KEYS.auth.setPassword.newLabel]:           'New password',
  [KEYS.auth.setPassword.newPlaceholder]:     'At least 8 characters',
  [KEYS.auth.setPassword.confirmLabel]:       'Confirm new password',
  [KEYS.auth.setPassword.confirmPlaceholder]: 'Repeat your password',
  [KEYS.auth.setPassword.submit]:             'Set new password',
  [KEYS.auth.setPassword.successTitle]:       'Password updated',
  [KEYS.auth.setPassword.successText]:        'Your password has been changed. Sign in with your new password.',
  [KEYS.auth.setPassword.errorTitle]:         'Error',
  [KEYS.auth.setPassword.errorFallback]:      'Could not update password. The reset link may have expired.',

  // ── Validation messages ───────────────────────────────────────────────────
  [KEYS.auth.validation.emailInvalid]:       'Enter a valid email address.',
  [KEYS.auth.validation.emailRequired]:      'Email is required.',
  [KEYS.auth.validation.passwordRequired]:   'Password is required.',
  [KEYS.auth.validation.identifierRequired]: 'Email or phone number is required.',
  [KEYS.auth.validation.passwordMin]:        'Password must be at least 8 characters.',
  [KEYS.auth.validation.passwordMismatch]:   'Passwords do not match.',
  [KEYS.auth.validation.confirmRequired]:    'Please confirm your password.',
};

export function t(key: string): string {
  return translations[key] ?? key;
}

export default translations;
