import React, { useState, lazy, Suspense } from 'react';
import {
  Stack, Group, Button, TextInput, Pagination, Center, Text, Select,
} from '@mantine/core';
import { useAuth } from '../../../common/context/AuthContext';
import { useProducts } from '../../../common/hooks/useProducts';
import { useCategories } from '../../../common/hooks/useCategories';
import ProductTable from '../../../common/components/products/ProductTable';
import ProductFormDrawer from '../../../common/components/products/ProductFormDrawer';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import api from '../../../common/api';
import type { Product } from '../../../common/types';

const BulkImportModal = lazy(() => import('../../../common/components/products/BulkImportModal'));

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    products, total, page, limit, loading,
    search, category, setSearch, setPage, setCategory, refetch,
  } = useProducts();
  const { categories } = useCategories();
  const categoryOptions = [
    { value: '', label: t(KEYS.products.categoryFilter) },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [editing, setEditing]         = useState<Product | null>(null);
  const [importOpen, setImportOpen]   = useState(false);

  const canCreate = user?.is_owner || !!user?.can_create_products;
  const canUpdate = user?.is_owner || !!user?.can_update_products;
  const canDelete = user?.is_owner || !!user?.can_delete_products;

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  const uploadImages = async (productId: string, files: File[]) => {
    if (files.length === 0) return;
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    await api.post(`/products/${productId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleSubmit = async (
    values: { name: string; category: string; brand: string; description: string },
    images: File[],
  ) => {
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, {
          name:        values.name,
          category:    values.category,
          brand:       values.brand || undefined,
          description: values.description || undefined,
        });
        if (images.length > 0) await uploadImages(editing.id, images);
        showSuccess(t(KEYS.products.toast.updated), '');
      } else {
        const form = new FormData();
        form.append('name', values.name);
        form.append('category', values.category);
        if (values.brand)       form.append('brand', values.brand);
        if (values.description) form.append('description', values.description);
        images.forEach((f) => form.append('images', f));
        const res = await api.post('/products', form);
        const newId = res.data.data?.id as string | undefined;
        if (newId && images.length === 0) {
          // Images already uploaded as part of the multipart POST — nothing extra to do
        }
        showSuccess(t(KEYS.products.toast.created), '');
      }
      closeDrawer();
      refetch();
    } catch (err: unknown) {
      const isImageError = (err as { config?: { url?: string } })?.config?.url?.includes('/images');
      showError(
        t(KEYS.common.error),
        isImageError
          ? t(KEYS.products.images.removeError)
          : editing ? t(KEYS.products.toast.updateError) : t(KEYS.products.toast.createError),
      );
    }
  };

  const handleDeleteImage = async (productId: string, imageId: string) => {
    await api.delete(`/products/${productId}/images/${imageId}`);
    setEditing((prev) =>
      prev
        ? { ...prev, images: (prev.images ?? []).filter((img) => img.id !== imageId) }
        : prev,
    );
  };

  const handleToggleStatus = async (product: Product) => {
    const isDeactivating = product.is_active;
    const confirmed = await showConfirm(
      t(isDeactivating ? KEYS.products.confirm.deactivateTitle : KEYS.products.confirm.activateTitle),
      t(isDeactivating ? KEYS.products.confirm.deactivateText  : KEYS.products.confirm.activateText),
    );
    if (!confirmed) return;
    try {
      if (isDeactivating) {
        await api.delete(`/products/${product.id}`);
        showSuccess(t(KEYS.products.toast.deactivated), '');
      } else {
        await api.patch(`/products/${product.id}/activate`);
        showSuccess(t(KEYS.products.toast.activated), '');
      }
      refetch();
    } catch {
      showError(t(KEYS.common.error), t(KEYS.products.toast.statusError));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <h1 className="ptitle">{t(KEYS.products.title)}</h1>
          <p className="psub">{t(KEYS.products.subtitle)}</p>
        </div>
        {canCreate && (
          <Group gap="xs">
            <Button variant="outline" color="green" onClick={() => setImportOpen(true)}>
              {t(KEYS.bulkImport.btnLabel)}
            </Button>
            <Button color="green" onClick={openAdd}>
              {t(KEYS.products.addBtn)}
            </Button>
          </Group>
        )}
      </Group>

      <Group>
        <TextInput
          placeholder={t(KEYS.products.searchPlaceholder)}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 280 }}
        />
        <Select
          data={categoryOptions}
          value={category || ''}
          onChange={(val) => setCategory(val ?? '')}
          style={{ width: 200 }}
          allowDeselect={false}
        />
      </Group>

      {loading ? (
        <Center py="xl">
          <Text c="dimmed" size="sm">{t(KEYS.common.loading)}</Text>
        </Center>
      ) : (
        <ProductTable
          products={products}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination total={totalPages} value={page} onChange={setPage} color="green" />
        </Group>
      )}

      <ProductFormDrawer
        opened={drawerOpen}
        editing={editing}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        onDeleteImage={handleDeleteImage}
      />

      <Suspense fallback={null}>
        <BulkImportModal
          opened={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={() => { setImportOpen(false); refetch(); }}
        />
      </Suspense>
    </Stack>
  );
};

export default ProductsPage;
