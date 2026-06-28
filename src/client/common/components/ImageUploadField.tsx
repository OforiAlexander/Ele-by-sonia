import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Box, SimpleGrid, Paper, ActionIcon, Tooltip, Text, Stack } from '@mantine/core';
import type { ProductImage } from '../types';
import { t } from '../translations';
import { KEYS } from '../keys';
import { showError } from '../utils/swal';

interface Props {
  existingImages?: ProductImage[];
  pendingFiles: File[];
  onPendingChange: (files: File[]) => void;
  onDeleteExisting?: (imageId: string) => Promise<void>;
  maxImages?: number;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

const ImageUploadField: React.FC<Props> = ({
  existingImages = [],
  pendingFiles,
  onPendingChange,
  onDeleteExisting,
  maxImages = 8,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = existingImages.length + pendingFiles.length;
  const canAddMore = totalCount < maxImages;

  const previewUrls = useMemo(
    () => pendingFiles.map((f) => URL.createObjectURL(f)),
    [pendingFiles],
  );

  useEffect(() => {
    return () => { previewUrls.forEach(URL.revokeObjectURL); };
  }, [previewUrls]);

  const addFiles = (files: File[]) => {
    const remaining = maxImages - totalCount;
    const filtered = files.filter((f) => ACCEPTED.includes(f.type)).slice(0, remaining);
    if (filtered.length > 0) {
      onPendingChange([...pendingFiles, ...filtered]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1 && canAddMore) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removePending = (index: number) => {
    onPendingChange(pendingFiles.filter((_, i) => i !== index));
  };

  const handleDeleteExisting = async (id: string) => {
    if (!onDeleteExisting) return;
    setDeletingId(id);
    try {
      await onDeleteExisting(id);
    } catch {
      showError(t(KEYS.common.error), t(KEYS.products.images.removeError));
    } finally {
      setDeletingId(null);
    }
  };

  const hasImages = existingImages.length > 0 || pendingFiles.length > 0;

  return (
    <Stack gap="sm">
      {canAddMore ? (
        <Box
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#0A5C3F' : '#dee2e6'}`,
            borderRadius: 8,
            background: dragActive ? 'rgba(10, 92, 63, 0.05)' : '#fafafa',
            padding: '28px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            userSelect: 'none',
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke={dragActive ? '#0A5C3F' : '#adb5bd'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block', margin: '0 auto' }}
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
          </svg>
          <Text size="sm" fw={500} c={dragActive ? 'green.8' : 'dark'} mt="xs">
            {t(KEYS.products.images.dropHint)}
          </Text>
          <Text size="xs" c="blue.5" mt={4} style={{ textDecoration: 'underline' }}>
            {t(KEYS.products.images.browseHint)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t(KEYS.products.images.typeHint)}
          </Text>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </Box>
      ) : (
        <Box
          style={{
            border: '2px dashed #dee2e6',
            borderRadius: 8,
            background: '#fafafa',
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <Text size="xs" c="dimmed">{t(KEYS.products.images.maxReached)}</Text>
        </Box>
      )}

      {hasImages && (
        <SimpleGrid cols={4} spacing={6}>
          {existingImages.map((img) => (
            <Paper
              key={img.id}
              withBorder
              radius="sm"
              style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1 / 1' }}
            >
              <img
                src={img.image_path}
                alt=""
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                }}
              />
              {onDeleteExisting && (
                <Tooltip label={t(KEYS.products.images.removeLabel)}>
                  <ActionIcon
                    size="xs"
                    color="red"
                    variant="filled"
                    radius="xl"
                    loading={deletingId === img.id}
                    onClick={(e) => { e.stopPropagation(); handleDeleteExisting(img.id); }}
                    style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  >
                    ✕
                  </ActionIcon>
                </Tooltip>
              )}
            </Paper>
          ))}

          {pendingFiles.map((_, i) => (
            <Paper
              key={i}
              withBorder
              radius="sm"
              style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1 / 1' }}
            >
              <img
                src={previewUrls[i]}
                alt=""
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                }}
              />
              <Tooltip label={t(KEYS.products.images.removeLabel)}>
                <ActionIcon
                  size="xs"
                  color="red"
                  variant="filled"
                  radius="xl"
                  onClick={(e) => { e.stopPropagation(); removePending(i); }}
                  style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                >
                  ✕
                </ActionIcon>
              </Tooltip>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};

export default ImageUploadField;
