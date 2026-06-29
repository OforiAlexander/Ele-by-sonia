import React, { useRef, useState } from 'react';
import {
  Modal, Button, Text, Stack, Group, Paper, SimpleGrid, Anchor, Loader,
} from '@mantine/core';
import api from '../../api';
import { t } from '../../translations';
import { KEYS } from '../../keys';
import type { ImportResult } from '../../types';

interface Props {
  opened:    boolean;
  onClose:   () => void;
  onSuccess: () => void;
}

type Phase = 'idle' | 'uploading' | 'done' | 'error';

const BulkImportModal: React.FC<Props> = ({ opened, onClose, onSuccess }) => {
  const fileInputRef            = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [phase, setPhase]       = useState<Phase>('idle');
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const reset = () => {
    setFile(null);
    setPhase('idle');
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPhase('idle');
    setResult(null);
    setErrorMsg('');
  };

  const handleDownloadTemplate = async () => {
    const response = await api.get('/products/import/template', { responseType: 'blob' });
    const url  = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg(t(KEYS.bulkImport.noFile));
      return;
    }
    setPhase('uploading');
    setErrorMsg('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ data: ImportResult }>('/products/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data ?? null);
      setPhase('done');
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { errors?: Array<{ msg: string }> } } })
          ?.response?.data?.errors?.[0]?.msg
        ?? t(KEYS.bulkImport.errorFallback);
      setErrorMsg(msg);
      setPhase('error');
    }
  };

  const isUploading = phase === 'uploading';

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t(KEYS.bulkImport.modalTitle)}
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">{t(KEYS.bulkImport.modalSubtitle)}</Text>

        <Group justify="flex-end">
          <Anchor size="sm" onClick={handleDownloadTemplate} style={{ cursor: 'pointer' }}>
            {t(KEYS.bulkImport.downloadTemplate)}
          </Anchor>
        </Group>

        <Paper
          withBorder
          p="lg"
          style={{
            borderStyle:  'dashed',
            borderColor:  file ? '#40c057' : '#ced4da',
            borderRadius: 8,
            cursor:       'pointer',
            textAlign:    'center',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {file ? (
            <Stack gap={4} align="center">
              <Text size="sm" fw={500} c="green.7">{t(KEYS.bulkImport.fileSelected)}</Text>
              <Text size="xs" c="dimmed">{file.name}</Text>
            </Stack>
          ) : (
            <Stack gap={4} align="center">
              <Text size="sm" c="dimmed">{t(KEYS.bulkImport.dropHint)}</Text>
              <Text size="xs" c="dimmed">{t(KEYS.bulkImport.dropSubhint)}</Text>
            </Stack>
          )}
        </Paper>

        {phase === 'error' && (
          <Text size="sm" c="red">{errorMsg}</Text>
        )}

        {phase === 'done' && result && (
          <Stack gap="sm">
            <Text size="sm" fw={600} c="green.7">{t(KEYS.bulkImport.successTitle)}</Text>
            <SimpleGrid cols={2} spacing="xs">
              <Paper withBorder p="sm" radius="sm">
                <Text size="xs" c="dimmed">{t(KEYS.bulkImport.result.productsCreated)}</Text>
                <Text size="lg" fw={700}>{result.productsCreated}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="sm">
                <Text size="xs" c="dimmed">{t(KEYS.bulkImport.result.variantsCreated)}</Text>
                <Text size="lg" fw={700}>{result.variantsCreated}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="sm">
                <Text size="xs" c="dimmed">{t(KEYS.bulkImport.result.skipped)}</Text>
                <Text size="lg" fw={700}>{result.skipped}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="sm">
                <Text size="xs" c={result.errors > 0 ? 'red' : 'dimmed'}>{t(KEYS.bulkImport.result.errors)}</Text>
                <Text size="lg" fw={700} c={result.errors > 0 ? 'red' : undefined}>{result.errors}</Text>
              </Paper>
            </SimpleGrid>
            <Text size="xs" c="dimmed">{t(KEYS.bulkImport.result.reportSent)}</Text>
          </Stack>
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" color="gray" onClick={handleClose} disabled={isUploading}>
            {t(KEYS.common.cancel)}
          </Button>
          {phase !== 'done' && (
            <Button
              color="green"
              onClick={handleUpload}
              disabled={!file || isUploading}
              leftSection={isUploading ? <Loader size={14} color="white" /> : undefined}
            >
              {isUploading ? t(KEYS.bulkImport.uploading) : t(KEYS.bulkImport.uploadBtn)}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
};

export default BulkImportModal;
