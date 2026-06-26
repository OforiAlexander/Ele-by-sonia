import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { StaffMember, Role } from '../types';
import { t } from '../translations';
import { KEYS } from '../keys';

interface CreatePayload {
  name:    string;
  email:   string;
  phone?:  string;
  role_id: string;
}

interface UpdatePayload {
  name:    string;
  phone?:  string;
  role_id: string;
}

export function useStaff() {
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/staff'),
      api.get('/roles'),
    ])
      .then(([staffRes, rolesRes]) => {
        setStaff(staffRes.data.data.staff ?? []);
        setRoles(rolesRes.data.data ?? []);
      })
      .catch(() => {
        setError(t(KEYS.staff.loadError));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createStaff = useCallback(async (payload: CreatePayload) => {
    const res = await api.post('/staff', payload);
    setStaff((prev) => [res.data.data, ...prev]);
    return res.data.data as StaffMember;
  }, []);

  const updateStaff = useCallback(async (id: string, payload: UpdatePayload) => {
    const res = await api.put(`/staff/${id}`, payload);
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data.data } : s)));
    return res.data.data as StaffMember;
  }, []);

  const toggleStatus = useCallback(async (id: string) => {
    const res = await api.patch(`/staff/${id}/deactivate`);
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: res.data.data.is_active } : s)),
    );
  }, []);

  const createRole = useCallback(async (name: string, permissionIds: string[]) => {
    const res = await api.post('/roles', { name, permissionIds });
    const newRole = res.data.data as Role;
    setRoles((prev) => [...prev, newRole].sort((a, b) => a.name.localeCompare(b.name)));
    return newRole;
  }, []);

  const resendInvitation = useCallback(async (id: string) => {
    const res = await api.post(`/staff/${id}/resend-invitation`);
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data.data } : s)));
  }, []);

  const cancelInvitation = useCallback(async (id: string) => {
    await api.delete(`/staff/${id}`);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { staff, roles, loading, error, createStaff, updateStaff, toggleStatus, createRole, resendInvitation, cancelInvitation };
}
