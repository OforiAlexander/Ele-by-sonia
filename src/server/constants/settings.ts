export const SETTINGS = {
  LOW_STOCK_DEFAULT_THRESHOLD: 'LOW_STOCK_DEFAULT_THRESHOLD',
  BUSINESS_NAME: 'BUSINESS_NAME',
  BUSINESS_PHONE: 'BUSINESS_PHONE',
  BUSINESS_EMAIL: 'BUSINESS_EMAIL',
  SALE_NUMBER_PREFIX: 'SALE_NUMBER_PREFIX',
  ORDER_NUMBER_PREFIX: 'ORDER_NUMBER_PREFIX',
  PAYSTACK_CURRENCY: 'PAYSTACK_CURRENCY',
  LOW_STOCK_ALERT_ENABLED: 'LOW_STOCK_ALERT_ENABLED',
} as const;

export type SettingName = typeof SETTINGS[keyof typeof SETTINGS];

export interface SettingDefinition {
  name: SettingName;
  label: string;
  value: string;
  group: 'general' | 'inventory' | 'payments' | 'ecommerce';
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
];
