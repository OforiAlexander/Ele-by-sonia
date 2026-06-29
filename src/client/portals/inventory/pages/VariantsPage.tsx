import React, { useState, useEffect } from 'react';
import {
  Stack, Group, Button, Text, Center, Loader, Anchor, Grid,
} from '@mantine/core';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../common/context/AuthContext';
import { useVariants } from '../../../common/hooks/useVariants';
import OptionTypesPanel from '../../../common/components/variants/OptionTypesPanel';
import VariantTable from '../../../common/components/variants/VariantTable';
import VariantFormModal from '../../../common/components/variants/VariantFormModal';
import StockAddModal from '../../../common/components/variants/StockAddModal';
import StockAdjustModal from '../../../common/components/variants/StockAdjustModal';
import StockHistoryDrawer from '../../../common/components/variants/StockHistoryDrawer';
import ProductImageGallery from '../../../common/components/products/ProductImageGallery';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showSuccess, showError } from '../../../common/utils/swal';
import api from '../../../common/api';
import type { ProductVariant } from '../../../common/types';

const VariantsPage: React.FC = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const productId       = searchParams.get('productId');

  const {
    product, variants, optionTypes, loading, error,
    setVariants, setOptionTypes, refetch,
  } = useVariants(productId);

  const [addModalOpen, setAddModalOpen]       = useState(false);
  const [stockAddVariant, setStockAddVariant] = useState<ProductVariant | null>(null);
  const [adjustVariant, setAdjustVariant]     = useState<ProductVariant | null>(null);
  const [historyVariant, setHistoryVariant]   = useState<ProductVariant | null>(null);

  const canCreate      = user?.is_owner || !!user?.can_create_variants;
  const canEdit        = user?.is_owner || !!user?.can_update_variants;
  const canAddStock    = user?.is_owner || !!user?.can_add_stock;
  const canAdjust      = user?.is_owner || !!user?.can_adjust_stock;
  const canSetThresh   = user?.is_owner || !!user?.can_set_threshold;
  const canToggle      = user?.is_owner || !!user?.can_update_variants;
  const canEditProduct = user?.is_owner || !!user?.can_update_products;

  if (!productId) {
    return (
      <Center py="xl">
        <Text c="dimmed">{t(KEYS.variants.noProduct)}</Text>
      </Center>
    );
  }

  if (loading && !product) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (error || !product) {
    return (
      <Center py="xl">
        <Text c="red" size="sm">{error ?? t(KEYS.common.error)}</Text>
      </Center>
    );
  }

  const handleAddVariant = async (values: {
    sku: string;
    cost_price: number | '';
    selling_price: number | '';
    low_stock_threshold: number;
    selectedValueIds: string[];
  }) => {
    try {
      const res = await api.post('/variants', {
        product_id:          productId,
        sku:                 values.sku || undefined,
        cost_price:          values.cost_price,
        selling_price:       values.selling_price,
        low_stock_threshold: values.low_stock_threshold,
        optionValueIds:      values.selectedValueIds,
      });
      setVariants((prev) => [...prev, res.data.data]);
      setAddModalOpen(false);
      showSuccess(t(KEYS.variants.toast.created), '');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  const handleAddStock = async (variantId: string, quantity: number, note: string) => {
    try {
      const res = await api.post('/stock/add', { variant_id: variantId, quantity, note: note || undefined });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.data : v)));
      setStockAddVariant(null);
      showSuccess(t(KEYS.variants.toast.stockAdded), '');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  const handleAdjustStock = async (variantId: string, quantity: number, note: string) => {
    try {
      const res = await api.post('/stock/adjust', { variant_id: variantId, quantity, note });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.data : v)));
      setAdjustVariant(null);
      showSuccess(t(KEYS.variants.toast.stockAdjusted), '');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(
        t(KEYS.common.error),
        code === 'STOCK_INSUFFICIENT' ? t(KEYS.variants.stock.insufficientError) : t(KEYS.variants.toast.error),
      );
    }
  };

  const handleSetThreshold = async (variantId: string, threshold: number) => {
    try {
      const res = await api.patch(`/stock/threshold/${variantId}`, { low_stock_threshold: threshold });
      setVariants((prev) => prev.map((v) => (v.id === variantId ? res.data.data : v)));
      showSuccess(t(KEYS.variants.toast.thresholdUpdated), '');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  const handleToggleActive = async (variant: ProductVariant) => {
    try {
      const res = await api.patch(`/variants/${variant.id}/status`, { is_active: !variant.is_active });
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? res.data.data : v)));
      showSuccess(variant.is_active ? t(KEYS.variants.toast.deactivated) : t(KEYS.variants.toast.activated), '');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.variants.toast.error));
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Anchor
          size="sm"
          c="dimmed"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/products')}
        >
          ← {t(KEYS.variants.backToProducts)}
        </Anchor>
        <h1 className="ptitle" style={{ marginTop: 4 }}>{product.name}</h1>
        <p className="psub">{t(KEYS.variants.subtitle)}</p>
      </div>

      <ProductImageGallery product={product} canEdit={canEditProduct} onRefetch={refetch} />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <OptionTypesPanel
            productId={productId}
            optionTypes={optionTypes}
            canEdit={canEdit}
            onTypesChange={setOptionTypes}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="sm">
            <Group justify="flex-end">
              {canCreate && (
                <Button color="green" size="sm" onClick={() => setAddModalOpen(true)}>
                  {t(KEYS.variants.addBtn)}
                </Button>
              )}
            </Group>

            <VariantTable
              variants={variants}
              canAddStock={canAddStock}
              canAdjust={canAdjust}
              canSetThresh={canSetThresh}
              canToggle={canToggle}
              onAddStock={(v) => setStockAddVariant(v)}
              onAdjust={(v) => setAdjustVariant(v)}
              onHistory={(v) => setHistoryVariant(v)}
              onToggleActive={handleToggleActive}
              onSetThreshold={handleSetThreshold}
            />
          </Stack>
        </Grid.Col>
      </Grid>

      <VariantFormModal
        opened={addModalOpen}
        productId={productId}
        optionTypes={optionTypes}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddVariant}
      />

      <StockAddModal
        opened={!!stockAddVariant}
        variant={stockAddVariant}
        onClose={() => setStockAddVariant(null)}
        onSubmit={handleAddStock}
      />

      <StockAdjustModal
        opened={!!adjustVariant}
        variant={adjustVariant}
        onClose={() => setAdjustVariant(null)}
        onSubmit={handleAdjustStock}
      />

      <StockHistoryDrawer
        opened={!!historyVariant}
        variant={historyVariant}
        onClose={() => setHistoryVariant(null)}
      />
    </Stack>
  );
};

export default VariantsPage;
