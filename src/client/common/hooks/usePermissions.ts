import { useEffect, useState } from 'react';
import api from '../api';
import { Permission } from '../types';

export type PermissionsGrouped = Record<string, Permission[]>;

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsGrouped>({});
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/permissions')
      .then((res) => setPermissions(res.data.data ?? {}))
      .finally(() => setLoading(false));
  }, []);

  return { permissions, loading };
}
