export interface StaffInviteData {
    name:         string;
    email:        string;
    tempPassword: string;
    businessName: string;
    loginUrl:     string;
    logoUrl:      string;
    isResend:     boolean;
}

const baseStyles = `
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 32px auto; }
  .logo-row { text-align: center; padding: 0 0 24px; }
  .logo-row img { height: 56px; width: auto; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
  .card-body { padding: 32px; }
  .greeting { font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 12px; }
  .intro { color: #444; line-height: 1.6; margin: 0 0 24px; }
  .cred-box { border: 1px solid #e8e8e8; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
  .cred-label { font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #888; margin: 0 0 6px; }
  .cred-value { font-size: 15px; font-family: monospace; color: #1a1a1a; margin: 0; word-break: break-all; }
  .cred-value strong { font-size: 20px; letter-spacing: 2px; }
  .divider { height: 1px; background: #f0f0f0; margin: 0 0 24px; }
  .action-btn { display: inline-block; background: #50C878; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: bold; }
  .warning { margin-top: 24px; font-size: 12px; color: #888; line-height: 1.5; }
  .footer { padding: 20px 0 0; font-size: 12px; color: #aaa; text-align: center; }
`;

export function buildStaffInviteHtml(data: StaffInviteData): string {
    const heading = data.isResend
        ? `Your invitation has been resent`
        : `Welcome to ${data.businessName}`;

    const intro = data.isResend
        ? `Your invitation to <strong>${data.businessName}</strong> has been resent with new credentials. Use the details below to access your account.`
        : `Your account on <strong>${data.businessName}</strong> has been set up. Use the temporary credentials below to log in for the first time.`;

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
      <p class="intro">${intro}</p>

      <div class="cred-box">
        <p class="cred-label">Email address</p>
        <p class="cred-value">${data.email}</p>
      </div>

      <div class="cred-box">
        <p class="cred-label">Temporary password</p>
        <p class="cred-value"><strong>${data.tempPassword}</strong></p>
      </div>

      <div class="divider"></div>

      <a href="${data.loginUrl}" class="action-btn">Log in now</a>

      <p class="warning">
        You will be required to set a new password the first time you log in.
        Do not share these credentials with anyone.
        If you did not expect this invitation, please ignore this email.
      </p>
    </div>
  </div>
  <div class="footer">${data.businessName} &nbsp;&middot;&nbsp; This is an automated message</div>
</div>
</body>
</html>`;
}
