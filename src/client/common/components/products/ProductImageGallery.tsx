import React, { useState, useEffect } from 'react';
import { Card, Group, Button, Text, Modal, ActionIcon, Stack } from '@mantine/core';
import type { Product } from '../../types';
import ImageUploadField from '../ImageUploadField';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import { showSuccess, showError } from '../../utils/swal';
import api from '../../api';

interface Props {
  product:    Product;
  canEdit:    boolean;
  onRefetch:  () => void;
}

const ProductImageGallery: React.FC<Props> = ({ product, canEdit, onRefetch }) => {
  const images = product.images ?? [];

  const [lightboxOpen, setLightboxOpen]     = useState(false);
  const [lightboxIndex, setLightboxIndex]   = useState(0);
  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [pendingFiles, setPendingFiles]     = useState<File[]>([]);
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    if (lightboxIndex >= images.length && images.length > 0) {
      setLightboxIndex(images.length - 1);
    }
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setLightboxIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % images.length);
      if (e.key === 'Escape')     setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, images.length]);

  const handleDeleteExisting = async (imageId: string) => {
    await api.delete(`/products/${product.id}/images/${imageId}`);
    onRefetch();
  };

  const handleSave = async () => {
    if (pendingFiles.length === 0) { setEditImagesOpen(false); return; }
    setSaving(true);
    try {
      const form = new FormData();
      pendingFiles.forEach((f) => form.append('images', f));
      await api.post(`/products/${product.id}/images`, form);
      setPendingFiles([]);
      setEditImagesOpen(false);
      onRefetch();
      showSuccess(t(KEYS.products.toast.updated), '');
    } catch {
      showError(t(KEYS.common.error), t(KEYS.products.toast.updateError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card withBorder p="md" radius="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600} size="sm">{t(KEYS.products.gallery.title)}</Text>
          {canEdit && (
            <Button variant="subtle" size="xs" color="gray" onClick={() => setEditImagesOpen(true)}>
              {t(KEYS.products.gallery.editImages)}
            </Button>
          )}
        </Group>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((img, idx) => (
            <img
              key={img.id}
              src={img.image_path}
              alt={`${product.name} ${idx + 1}`}
              onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
              style={{
                width: 80, height: 80, objectFit: 'cover',
                borderRadius: 6, cursor: 'zoom-in', flexShrink: 0,
                border: '1px solid var(--mantine-color-gray-2)',
              }}
            />
          ))}
        </div>
      </Card>

      {/* Lightbox */}
      <Modal
        opened={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        size="xl"
        centered
        padding={0}
        styles={{
          content: { background: '#111', borderRadius: 8 },
          header:  { background: 'transparent', position: 'absolute', top: 8, right: 8, zIndex: 10 },
          close:   { color: '#fff' },
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420, padding: 16 }}>
          <img
            src={images[lightboxIndex]?.image_path}
            alt={product.name}
            style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 4 }}
          />
          {images.length > 1 && (
            <>
              <ActionIcon variant="filled" color="dark" size="lg" radius="xl"
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setLightboxIndex((i) => (i - 1 + images.length) % images.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </ActionIcon>
              <ActionIcon variant="filled" color="dark" size="lg" radius="xl"
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setLightboxIndex((i) => (i + 1) % images.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </ActionIcon>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 16 }}>
            {images.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                style={{
                  width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                  background: idx === lightboxIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'background 0.15s',
                }}
              />
            ))}
          </div>
        )}
      </Modal>

      {/* Edit images modal */}
      <Modal
        opened={editImagesOpen}
        onClose={() => { setEditImagesOpen(false); setPendingFiles([]); }}
        title={t(KEYS.products.gallery.title)}
        size="lg"
        centered
      >
        <Stack gap="md">
          <ImageUploadField
            existingImages={images}
            pendingFiles={pendingFiles}
            onPendingChange={setPendingFiles}
            onDeleteExisting={handleDeleteExisting}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray"
              onClick={() => { setEditImagesOpen(false); setPendingFiles([]); }}
              disabled={saving}
            >
              {t(KEYS.products.drawer.cancel)}
            </Button>
            <Button color="green" loading={saving} onClick={handleSave}>
              {t(KEYS.products.gallery.save)}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default ProductImageGallery;
