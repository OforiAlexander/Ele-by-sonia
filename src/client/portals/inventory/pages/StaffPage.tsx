import React, { useState } from 'react';
import { Button } from '@mantine/core';
import Swal from 'sweetalert2';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { useAuth } from '../../../common/context/AuthContext';
import { useStaff } from '../../../common/hooks/useStaff';
import StaffSummaryBar from '../../../common/components/StaffSummaryBar';
import StaffFilterBar, { StaffFilter } from '../../../common/components/StaffFilterBar';
import StaffTable from '../../../common/components/StaffTable';
import StaffFormModal from '../../../common/components/StaffFormModal';
import { StaffMember } from '../../../common/types';

interface FormValues {
  name:    string;
  email:   string;
  phone:   string;
  role_id: string;
}

const StaffPage: React.FC = () => {
  const { user }                                                           = useAuth();
  const { staff, roles, loading, createStaff, updateStaff, toggleStatus, createRole } = useStaff();
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<StaffFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<StaffMember | null>(null);

  const canCreate     = !!(user?.is_owner || user?.can_create_staff);
  const canUpdate     = !!(user?.is_owner || user?.can_update_staff);
  const canDeactivate = !!(user?.is_owner || user?.can_deactivate_staff);

  const activeCount   = staff.filter((s) => s.is_active).length;
  const inactiveCount = staff.filter((s) => !s.is_active).length;

  const filtered = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active'   && s.is_active) ||
      (filter === 'inactive' && !s.is_active);
    return matchesSearch && matchesFilter;
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (s: StaffMember) => { setEditing(s); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditing(null); };

  const handleToggleStatus = async (s: StaffMember) => {
    const isActive = s.is_active;
    const result = await Swal.fire({
      title:              isActive ? t(KEYS.staff.confirmDeactivateTitle) : t(KEYS.staff.confirmReactivateTitle),
      text:               isActive ? t(KEYS.staff.confirmDeactivateText)  : t(KEYS.staff.confirmReactivateText),
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonText:  isActive ? t(KEYS.staff.deactivate) : t(KEYS.staff.reactivate),
      confirmButtonColor: isActive ? '#d33' : '#0E7A52',
    });
    if (!result.isConfirmed) return;
    try {
      await toggleStatus(s.id);
    } catch {
      Swal.fire({ title: t(KEYS.staff.errorToggleTitle), text: t(KEYS.staff.errorToggleFallback), icon: 'error' });
    }
  };

  const handleSubmit = async (values: FormValues) => {
    const payload = {
      name:    values.name,
      email:   values.email,
      phone:   values.phone   || undefined,
      role_id: values.role_id || undefined,
    };
    try {
      editing ? await updateStaff(editing.id, payload) : await createStaff(payload);
      handleClose();
    } catch {
      Swal.fire({
        title: editing ? t(KEYS.staff.errorUpdateTitle)    : t(KEYS.staff.errorCreateTitle),
        text:  editing ? t(KEYS.staff.errorUpdateFallback) : t(KEYS.staff.errorCreateFallback),
        icon:  'error',
      });
    }
  };

  return (
    <>
      <div className="reveal in">
        <div className="staff-page-header">
          <div>
            <p className="ptitle">{t(KEYS.staff.title)}</p>
            <p className="psub">{t(KEYS.staff.subtitle)}</p>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <span className="staff-add-btn">
                <span className="staff-btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
                {t(KEYS.staff.addStaff)}
              </span>
            </Button>
          )}
        </div>

        <StaffSummaryBar
          total={staff.length}
          active={activeCount}
          inactive={inactiveCount}
          loading={loading}
        />

        <div className="card">
          <StaffFilterBar
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            total={staff.length}
            active={activeCount}
            inactive={inactiveCount}
          />
          <StaffTable
            staff={filtered}
            loading={loading}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </div>

      <StaffFormModal
        opened={modalOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        staff={editing}
        roles={roles}
        onCreateRole={createRole}
      />
    </>
  );
};

export default StaffPage;
