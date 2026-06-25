import { KEYS } from './keys';

const translations: Record<string, string> = {
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
  [KEYS.nav.dashboard]:                   'Dashboard',
  [KEYS.nav.inventory]:                   'Inventory',
  [KEYS.nav.sales]:                       'Sales',
  [KEYS.nav.orders]:                      'Orders',
  [KEYS.nav.reports]:                     'Reports',
  [KEYS.nav.staff]:                       'Staff',
  [KEYS.nav.settings]:                    'Settings',
  [KEYS.nav.logout]:                      'Logout',
  [KEYS.common.loading]:                  'Loading…',
  [KEYS.common.loadingDashboard]:         'Loading dashboard…',
  [KEYS.common.noData]:                   '—',
};

export function t(key: string): string {
  return translations[key] ?? key;
}

export default translations;
