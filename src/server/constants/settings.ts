export const SETTINGS = {
  LOW_STOCK_DEFAULT_THRESHOLD: 'LOW_STOCK_DEFAULT_THRESHOLD',
  BUSINESS_NAME:               'BUSINESS_NAME',
  BUSINESS_PHONE:              'BUSINESS_PHONE',
  BUSINESS_EMAIL:              'BUSINESS_EMAIL',
  SALE_NUMBER_PREFIX:          'SALE_NUMBER_PREFIX',
  ORDER_NUMBER_PREFIX:         'ORDER_NUMBER_PREFIX',
  PAYSTACK_CURRENCY:           'PAYSTACK_CURRENCY',
  LOW_STOCK_ALERT_ENABLED:     'LOW_STOCK_ALERT_ENABLED',
  SALES_GLOBAL_DISCOUNT_RATE:     'SALES_GLOBAL_DISCOUNT_RATE',
  RECEIPT_STORE_ADDRESS:          'RECEIPT_STORE_ADDRESS',
  RECEIPT_FOOTER_MESSAGE:         'RECEIPT_FOOTER_MESSAGE',
  RECEIPT_SHOW_LOGO:              'RECEIPT_SHOW_LOGO',
  REFUND_VALIDITY_DAYS:           'REFUND_VALIDITY_DAYS',
  SPLIT_TENDER_ENABLED:           'SPLIT_TENDER_ENABLED',
  INVENTORY_LEVY_ENABLED:         'INVENTORY_LEVY_ENABLED',
  INVENTORY_LEVY_TYPE:            'INVENTORY_LEVY_TYPE',
  INVENTORY_LEVY_AMOUNT:          'INVENTORY_LEVY_AMOUNT',
  MOMO_PENDING_TIMEOUT_MINUTES:   'MOMO_PENDING_TIMEOUT_MINUTES',
  EOD_REPORT_ENABLED:             'EOD_REPORT_ENABLED',
  EOD_REPORT_TIME:                'EOD_REPORT_TIME',
} as const;

export type SettingName = typeof SETTINGS[keyof typeof SETTINGS];

export interface SettingDefinition {
  name: SettingName;
  label: string;
  value: string;
  group: 'general' | 'inventory' | 'payments' | 'ecommerce' | 'reports';
  editable: boolean;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    name: SETTINGS.LOW_STOCK_DEFAULT_THRESHOLD,
    label: 'Default low stock warning level',
    value: '5',
    group: 'inventory',
    editable: true,
  },
  {
    name: SETTINGS.BUSINESS_NAME,
    label: 'Business display name',
    value: 'Elegance by Sconia',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.BUSINESS_PHONE,
    label: 'Business contact phone',
    value: '+233507738490',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.BUSINESS_EMAIL,
    label: 'Business contact email',
    value: 'elegancebysconia@gmail.com',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.SALE_NUMBER_PREFIX,
    label: 'Prefix for sale reference numbers',
    value: 'S-',
    group: 'inventory',
    editable: false,
  },
  {
    name: SETTINGS.ORDER_NUMBER_PREFIX,
    label: 'Prefix for online order numbers',
    value: 'O-',
    group: 'ecommerce',
    editable: false,
  },
  {
    name: SETTINGS.PAYSTACK_CURRENCY,
    label: 'Currency code for Paystack',
    value: 'GHS',
    group: 'payments',
    editable: false,
  },
  {
    name: SETTINGS.LOW_STOCK_ALERT_ENABLED,
    label: 'Send email when stock hits threshold',
    value: 'true',
    group: 'inventory',
    editable: true,
  },
  {
    name: SETTINGS.SALES_GLOBAL_DISCOUNT_RATE,
    label: 'Global sale discount rate (%)',
    value: '0',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.RECEIPT_STORE_ADDRESS,
    label: 'Store address shown on receipts',
    value: '',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.RECEIPT_FOOTER_MESSAGE,
    label: 'Footer message on receipts',
    value: 'Thank you for shopping with us!',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.RECEIPT_SHOW_LOGO,
    label: 'Show store logo on receipts',
    value: 'true',
    group: 'general',
    editable: true,
  },
  {
    name: SETTINGS.REFUND_VALIDITY_DAYS,
    label: 'Days after purchase that returns are accepted',
    value: '7',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.SPLIT_TENDER_ENABLED,
    label: 'Allow split payment (cash + mobile money)',
    value: 'false',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.INVENTORY_LEVY_ENABLED,
    label: 'Apply internal levy per unit sold',
    value: 'false',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.INVENTORY_LEVY_TYPE,
    label: 'Levy calculation method (flat or percent)',
    value: 'flat',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.INVENTORY_LEVY_AMOUNT,
    label: 'Levy amount (GHS per unit, or % of price)',
    value: '0',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.MOMO_PENDING_TIMEOUT_MINUTES,
    label: 'Minutes before an unapproved Momo payment is cancelled',
    value: '15',
    group: 'payments',
    editable: true,
  },
  {
    name: SETTINGS.EOD_REPORT_ENABLED,
    label: 'Send end-of-day sales report by email',
    value: 'true',
    group: 'reports',
    editable: true,
  },
  {
    name: SETTINGS.EOD_REPORT_TIME,
    label: 'Time to send the end-of-day report (HH:mm, 24-hour)',
    value: '22:00',
    group: 'reports',
    editable: true,
  },
];
