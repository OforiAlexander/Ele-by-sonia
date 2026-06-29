import { usePublicSettings } from './usePublicSettings';
import { formatCurrency as _formatCurrency, formatPrice as _formatPrice } from '../utils/formatCurrency';

export function useCurrency() {
    const settings = usePublicSettings();
    const symbol = settings['CURRENCY_SYMBOL'] ?? '₵';
    return {
        formatCurrency: (v: number) => _formatCurrency(v, symbol),
        formatPrice: (amount: number | string) => _formatPrice(amount, symbol),
        symbol,
    };
}
