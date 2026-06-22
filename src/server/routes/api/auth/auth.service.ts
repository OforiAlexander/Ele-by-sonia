import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../../../models/User';
import { sendMail } from '../../../services/mail/send-mail';
import { verifyRecaptcha } from '../../../services/recaptcha';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export type SafeUser = Omit<User, 'password_hash' | 'otp_code' | 'reset_token'>;

function stripSensitive(user: User): SafeUser {
    const { password_hash, otp_code, reset_token, ...safe } = user as any;
    return safe;
}

export async function login(
    email: string,
    password: string,
    recaptchaToken: string
): Promise<SafeUser> {
    const valid = await verifyRecaptcha(recaptchaToken);
    if (!valid) throw Object.assign(new Error('Invalid reCAPTCHA.'), { status: 400, code: 'RECAPTCHA_FAILED' });

    const user = await User.query()
        .findOne({ email: email.toLowerCase() })
        .withGraphFetched('role.permissions')
        .modifyGraph('role.permissions', (b) => b.select('permissions.name'));

    if (!user) throw Object.assign(new Error('Invalid credentials.'), { status: 401, code: 'INVALID_CREDENTIALS' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw Object.assign(new Error('Invalid credentials.'), { status: 401, code: 'INVALID_CREDENTIALS' });

    if (!user.is_active) throw Object.assign(new Error('Account is deactivated.'), { status: 403, code: 'ACCOUNT_INACTIVE' });

    return stripSensitive(user);
}

export async function getMe(userId: string): Promise<SafeUser> {
    const user = await User.query()
        .findById(userId)
        .withGraphFetched('role.permissions')
        .modifyGraph('role.permissions', (b) => b.select('permissions.name'));

    if (!user) throw Object.assign(new Error('User not found.'), { status: 404, code: 'NOT_FOUND' });
    return stripSensitive(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.query().findById(userId);
    if (!user) throw Object.assign(new Error('User not found.'), { status: 404, code: 'NOT_FOUND' });

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) throw Object.assign(new Error('Current password is incorrect.'), { status: 401, code: 'INVALID_CREDENTIALS' });

    const hash = await bcrypt.hash(newPassword, 12);
    await User.query().patchAndFetchById(userId, {
        password_hash: hash,
        must_change_password: false,
        sessions_invalidated_at: new Date().toISOString(),
    });
}

export async function forgotPassword(identifier: string): Promise<void> {
    const user = await User.query().findOne((builder) =>
        builder.where('email', identifier.toLowerCase()).orWhere('phone', identifier)
    );

    if (!user) return;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.query().patchAndFetchById(user.id, {
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        otp_attempts: 0,
    });

    await sendMail({
        to: user.email,
        subject: 'Your Elegance by Sconia password reset code',
        html: `<p>Your reset code is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });
}

export async function verifyCode(identifier: string, code: string): Promise<string> {
    const user = await User.query().findOne((builder) =>
        builder.where('email', identifier.toLowerCase()).orWhere('phone', identifier)
    );

    const invalid = () => Object.assign(new Error('Invalid or expired code.'), { status: 400, code: 'CODE_INVALID' });

    if (!user || !user.otp_code || !user.otp_expires_at) throw invalid();
    if (new Date(user.otp_expires_at) < new Date()) throw invalid();
    if (user.otp_attempts >= OTP_MAX_ATTEMPTS) throw invalid();

    if (user.otp_code !== code) {
        await User.query().patchAndFetchById(user.id, { otp_attempts: user.otp_attempts + 1 });
        throw invalid();
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await User.query().patchAndFetchById(user.id, {
        otp_code: null as any,
        otp_expires_at: null as any,
        otp_attempts: 0,
        reset_token: resetToken,
        reset_token_expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
    });

    return resetToken;
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const user = await User.query().findOne({ reset_token: token });
    const invalid = () => Object.assign(new Error('Invalid or expired reset token.'), { status: 400, code: 'TOKEN_INVALID' });

    if (!user || !user.reset_token_expires_at) throw invalid();
    if (new Date(user.reset_token_expires_at) < new Date()) throw invalid();

    const hash = await bcrypt.hash(newPassword, 12);
    await User.query().patchAndFetchById(user.id, {
        password_hash: hash,
        must_change_password: false,
        reset_token: null as any,
        reset_token_expires_at: null as any,
        sessions_invalidated_at: new Date().toISOString(),
    });

    return user.id;
}
