export const KEYS = {
  dashboard: {
    title: 'dashboard.title',
    subtitle: 'dashboard.subtitle',
    kpi: {
      totalProducts:    'dashboard.kpi.totalProducts',
      totalProductsSub: 'dashboard.kpi.totalProductsSub',
      inventoryValue:   'dashboard.kpi.inventoryValue',
      inventoryValueSub:'dashboard.kpi.inventoryValueSub',
      totalSales:       'dashboard.kpi.totalSales',
      totalSalesSub:    'dashboard.kpi.totalSalesSub',
      lowStock:         'dashboard.kpi.lowStock',
      lowStockSub:      'dashboard.kpi.lowStockSub',
      outOfStock:       'dashboard.kpi.outOfStock',
      outOfStockSub:    'dashboard.kpi.outOfStockSub',
      topSellingItem:   'dashboard.kpi.topSellingItem',
      topSellingItemSub:'dashboard.kpi.topSellingItemSub',
    },
    chart: {
      salesTrend: 'dashboard.chart.salesTrend',
    },
    topItems: {
      title: 'dashboard.topItems.title',
      empty: 'dashboard.topItems.empty',
    },
    stockHealth: {
      title:      'dashboard.stockHealth.title',
      healthy:    'dashboard.stockHealth.healthy',
      lowStock:   'dashboard.stockHealth.lowStock',
      outOfStock: 'dashboard.stockHealth.outOfStock',
    },
    categories: {
      title: 'dashboard.categories.title',
      empty: 'dashboard.categories.empty',
    },
  },
  nav: {
    dashboard: 'nav.dashboard',
    inventory: 'nav.inventory',
    sales:     'nav.sales',
    orders:    'nav.orders',
    reports:   'nav.reports',
    staff:     'nav.staff',
    settings:  'nav.settings',
    logout:    'nav.logout',
  },
  common: {
    loading:          'common.loading',
    loadingDashboard: 'common.loadingDashboard',
    noData:           'common.noData',
  },
} as const;
