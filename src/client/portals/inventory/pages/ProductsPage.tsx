import React, { useState } from 'react';
import {
  Stack, Group, Button, TextInput, Pagination, Center, Text,
} from '@mantine/core';
import { useAuth } from '../../../common/context/AuthContext';
import { useProducts } from '../../../common/hooks/useProducts';
import ProductTable from '../../../common/components/products/ProductTable';
import ProductFormDrawer from '../../../common/components/products/ProductFormDrawer';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showConfirm, showSuccess, showError } from '../../../common/utils/swal';
import api from '../../../common/api';
import type { Product } from '../../../common/types';

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    products, total, page, limit, loading,
    search, setSearch, setPage, refetch,
  } = useProducts();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);

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
    const body = {
      name:        values.name,
      category:    values.category,
      brand:       values.brand || undefined,
      description: values.description || undefined,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, body);
        await uploadImages(editing.id, images);
        showSuccess(t(KEYS.products.toast.updated), '');
      } else {
        const res = await api.post('/products', body);
        await uploadImages(res.data.data.id, images);
        showSuccess(t(KEYS.products.toast.created), '');
      }
      closeDrawer();
      refetch();
    } catch {
      showError(t(KEYS.common.error), editing ? t(KEYS.products.toast.updateError) : t(KEYS.products.toast.createError));
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
        await api.put(`/products/${product.id}`, {
          name:        product.name,
          category:    product.category,
          brand:       product.brand ?? undefined,
          description: product.description ?? undefined,
        });
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
          <Button color="green" onClick={openAdd}>
            {t(KEYS.products.addBtn)}
          </Button>
        )}
      </Group>

      <Group>
        <TextInput
          placeholder={t(KEYS.products.searchPlaceholder)}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ flex: 1, maxWidth: 320 }}
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
    </Stack>
  );
};

export default ProductsPage;
