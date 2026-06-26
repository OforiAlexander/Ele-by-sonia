import React, { useState } from 'react';
import { FormikHelpers } from 'formik';
import { Alert, Button } from '@mantine/core';
import { t } from '../../../common/translations';
import { KEYS } from '../../../common/keys';
import { showConfirm, showError, showSuccess } from '../../../common/utils/swal';
import { useAuth } from '../../../common/context/AuthContext';
import { useStaff } from '../../../common/hooks/useStaff';
import StaffSummaryBar from '../../../common/components/StaffSummaryBar';
import StaffFilterBar, { StaffFilter } from '../../../common/components/StaffFilterBar';
import StaffTable from '../../../common/components/StaffTable';
import StaffFormModal, { StaffFormValues } from '../../../common/components/StaffFormModal';
import { StaffMember } from '../../../common/types';

const PlusIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const StaffPage: React.FC = () => {
  const { user } = useAuth();
  const {
    staff, roles, loading, error,
    createStaff, updateStaff, toggleStatus, createRole,
    resendInvitation, cancelInvitation,
  } = useStaff();

  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<StaffFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<StaffMember | null>(null);

  const canCreate     = !!(user?.is_owner || user?.can_create_staff);
  const canUpdate     = !!(user?.is_owner || user?.can_update_staff);
  const canDeactivate = !!(user?.is_owner || user?.can_deactivate_staff);

  const pendingCount  = staff.filter((s) => s.must_change_password).length;
  const activeCount   = staff.filter((s) => s.is_active && !s.must_change_password).length;
  const inactiveCount = staff.filter((s) => !s.is_active).length;

  const filtered = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all'      ||
      (filter === 'active'   && s.is_active && !s.must_change_password) ||
      (filter === 'pending'  && s.must_change_password) ||
      (filter === 'inactive' && !s.is_active);
    return matchesSearch && matchesFilter;
  });

  const openCreate  = () => { setEditing(null); setModalOpen(true); };
  const handleEdit  = (s: StaffMember) => { setEditing(s); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditing(null); };

  const handleToggleStatus = async (s: StaffMember) => {
    const isActive = s.is_active;
    const result = await showConfirm(
      isActive ? t(KEYS.staff.confirmDeactivateTitle) : t(KEYS.staff.confirmReactivateTitle),
      isActive ? t(KEYS.staff.confirmDeactivateText)  : t(KEYS.staff.confirmReactivateText),
    );
    if (!result.isConfirmed) return;
    try {
      await toggleStatus(s.id);
    } catch {
      showError(t(KEYS.staff.errorToggleTitle), t(KEYS.staff.errorToggleFallback));
    }
  };

  const handleResendInvite = async (s: StaffMember) => {
    const result = await showConfirm(
      t(KEYS.staff.confirmResendInviteTitle),
      t(KEYS.staff.confirmResendInviteText),
    );
    if (!result.isConfirmed) return;
    try {
      await resendInvitation(s.id);
      showSuccess(t(KEYS.staff.inviteResentTitle), t(KEYS.staff.inviteResentText));
    } catch {
      showError(t(KEYS.staff.errorResendTitle), t(KEYS.staff.errorResendFallback));
    }
  };

  const handleCancelInvite = async (s: StaffMember) => {
    const result = await showConfirm(
      t(KEYS.staff.confirmCancelInviteTitle),
      t(KEYS.staff.confirmCancelInviteText),
    );
    if (!result.isConfirmed) return;
    try {
      await cancelInvitation(s.id);
      showSuccess(t(KEYS.staff.inviteCancelledTitle), t(KEYS.staff.inviteCancelledText));
    } catch {
      showError(t(KEYS.staff.errorCancelTitle), t(KEYS.staff.errorCancelFallback));
    }
  };

  const handleSubmit = async (values: StaffFormValues, helpers: FormikHelpers<StaffFormValues>) => {
    try {
      if (editing) {
        await updateStaff(editing.id, {
          name:    values.name,
          phone:   values.phone || undefined,
          role_id: values.role_id,
        });
        handleClose();
        showSuccess(t(KEYS.staff.successUpdateTitle), t(KEYS.staff.successUpdateText));
      } else {
        await createStaff({
          name:    values.name,
          email:   values.email,
          phone:   values.phone || undefined,
          role_id: values.role_id,
        });
        handleClose();
        showSuccess(
          t(KEYS.staff.inviteSentTitle),
          t(KEYS.staff.inviteSentText).replace('{email}', values.email),
        );
      }
    } catch (err: any) {
      const status: number  = err?.response?.status;
      const field: string   = err?.response?.data?.field ?? '';
      const message: string = err?.response?.data?.message ?? '';

      if (status === 409 && field === 'email') {
        helpers.setFieldError('email', t(KEYS.staff.form.validation.emailDuplicate));
        return;
      }
      if (status === 409 && field === 'phone') {
        helpers.setFieldError('phone', t(KEYS.staff.form.validation.phoneDuplicate));
        return;
      }
      if (status === 422 && field) {
        helpers.setFieldError(field as keyof StaffFormValues, message);
        return;
      }

      showError(
        editing ? t(KEYS.staff.errorUpdateTitle)    : t(KEYS.staff.errorCreateTitle),
        editing ? t(KEYS.staff.errorUpdateFallback) : t(KEYS.staff.errorCreateFallback),
      );
    }
  };

  return (
    <>
      <div className="reveal in">
        <div className="staff-page-header">
          <div>
            <h1 className="ptitle">{t(KEYS.staff.title)}</h1>
            <p className="psub">{t(KEYS.staff.subtitle)}</p>
          </div>
          {canCreate && (
            <Button leftSection={PlusIcon} onClick={openCreate}>
              {t(KEYS.staff.addStaff)}
            </Button>
          )}
        </div>

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        <StaffSummaryBar
          total={staff.length}
          active={activeCount}
          pending={pendingCount}
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
            pending={pendingCount}
            inactive={inactiveCount}
          />
          <StaffTable
            staff={filtered}
            loading={loading}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
            canCreate={canCreate}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onResendInvite={handleResendInvite}
            onCancelInvite={handleCancelInvite}
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
