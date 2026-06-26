import Swal, { SweetAlertResult } from 'sweetalert2';

const BTN = '#0A5C3F';

export const showError = (title: string, text: string): Promise<SweetAlertResult> =>
  Swal.fire({ icon: 'error', title, text, confirmButtonColor: BTN });

export const showInfo = (title: string, text: string): Promise<SweetAlertResult> =>
  Swal.fire({ icon: 'info', title, text, confirmButtonColor: BTN });

export const showSuccess = (title: string, text: string): Promise<SweetAlertResult> =>
  Swal.fire({ icon: 'success', title, text, confirmButtonColor: BTN });

export const showConfirm = (title: string, text: string): Promise<SweetAlertResult> =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: BTN,
    cancelButtonColor: '#adb5bd',
    confirmButtonText: 'Yes, confirm',
    cancelButtonText: 'Cancel',
  });
