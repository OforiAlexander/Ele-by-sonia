export interface StaffCancelledData {
    name:         string;
    businessName: string;
    logoUrl:      string;
}

const baseStyles = `
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 32px auto; }
  .logo-row { text-align: center; padding: 0 0 24px; }
  .logo-row img { height: 56px; width: auto; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
  .card-body { padding: 32px; }
  .greeting { font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 12px; }
  .body-text { color: #444; line-height: 1.6; margin: 0 0 16px; }
  .footer { padding: 20px 0 0; font-size: 12px; color: #aaa; text-align: center; }
`;

export function buildStaffCancelledHtml(data: StaffCancelledData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${baseStyles}</style></head>
<body>
<div class="wrapper">
  <div class="logo-row">
    <img src="${data.logoUrl}" alt="${data.businessName} logo" />
  </div>
  <div class="card">
    <div class="card-body">
      <p class="greeting">Hi ${data.name},</p>
      <p class="body-text">
        Your invitation to join <strong>${data.businessName}</strong> has been cancelled.
        Your account has been removed from our system.
      </p>
      <p class="body-text">
        If you believe this was done in error, please contact your store administrator.
      </p>
    </div>
  </div>
  <div class="footer">${data.businessName} &nbsp;&middot;&nbsp; This is an automated message</div>
</div>
</body>
</html>`;
}
