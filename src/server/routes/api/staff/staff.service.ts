import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../../../models/User';
import { sendMail } from '../../../services/mail/send-mail';
import logger from '../../../services/logger';

const SENSITIVE = ['password_hash', 'otp_code', 'otp_expires_at', 'otp_attempts', 'reset_token', 'reset_token_expires_at'];

function strip(user: User): Omit<User, 'password_hash' | 'otp_code' | 'reset_token'> {
    const obj = { ...user } as any;
    for (const key of SENSITIVE) delete obj[key];
    return obj;
}

function baseQuery() {
    return User.query()
        .where({ is_owner: false })
        .withGraphFetched('role')
        .modifyGraph('role', (b) => b.select('roles.id', 'roles.name'))
        .orderBy('name');
}

export async function listStaff(
    page = 1,
    limit = 50,
): Promise<{ staff: ReturnType<typeof strip>[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;
    const [users, countResult] = await Promise.all([
        baseQuery().offset(offset).limit(limit),
        User.query().where({ is_owner: false }).count('id as count').first(),
    ]);
    return { staff: users.map(strip), total: Number((countResult as any)?.count ?? 0), page, limit };
}

export async function getStaffMember(id: string) {
    const user = await User.query()
        .findById(id)
        .where({ is_owner: false })
        .withGraphFetched('role')
        .modifyGraph('role', (b) => b.select('roles.id', 'roles.name'));

    if (!user) throw Object.assign(new Error('Staff member not found.'), { status: 404, code: 'NOT_FOUND' });
    return strip(user);
}

export async function createStaff(
    name: string,
    email: string,
    phone: string | undefined,
    roleId: string,
): Promise<ReturnType<typeof strip>> {
    const existing = await User.query().findOne({ email: email.toLowerCase() });
    if (existing) throw Object.assign(new Error('A user with that email already exists.'), { status: 409, code: 'CONFLICT', field: 'email' });

    if (phone) {
        const existingPhone = await User.query().findOne({ phone });
        if (existingPhone) throw Object.assign(new Error('A user with that phone number already exists.'), { status: 409, code: 'CONFLICT', field: 'phone' });
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);

    const user = await User.query().insertAndFetch({
        name,
        email: email.toLowerCase(),
        phone: phone ?? '',
        password_hash: hash,
        role_id: roleId ?? undefined,
        is_owner: false,
        is_active: true,
        must_change_password: true,
        otp_attempts: 0,
    });

    sendMail({
        to: user.email,
        subject: 'Welcome to Elegance by Sconia',
        html: `<p>Hi ${user.name},</p><p>Your account has been created. Your temporary password is: <strong>${tempPassword}</strong></p><p>Please log in and change your password immediately.</p>`,
    }).catch((err) => logger.error('Welcome email failed for %s: %o', user.email, err));

    return strip(user);
}

export async function updateStaff(
    id: string,
    name: string,
    phone: string | undefined,
    roleId: string,
): Promise<ReturnType<typeof strip>> {
    const user = await User.query().findById(id).where({ is_owner: false });
    if (!user) throw Object.assign(new Error('Staff member not found.'), { status: 404, code: 'NOT_FOUND' });

    if (phone) {
        const existingPhone = await User.query().findOne({ phone }).whereNot('id', id);
        if (existingPhone) throw Object.assign(new Error('A user with that phone number already exists.'), { status: 409, code: 'CONFLICT', field: 'phone' });
    }

    const updated = await User.query().patchAndFetchById(id, {
        name,
        phone: phone ?? user.phone,
        role_id: roleId as any,
    });

    return strip(updated!);
}

export async function resendInvitation(id: string): Promise<ReturnType<typeof strip>> {
    const user = await User.query().findById(id).where({ is_owner: false });
    if (!user) throw Object.assign(new Error('Staff member not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!user.must_change_password) throw Object.assign(new Error('Invitation already accepted.'), { status: 409, code: 'CONFLICT' });

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);

    const updated = await User.query().patchAndFetchById(id, { password_hash: hash, must_change_password: true });

    sendMail({
        to: user.email,
        subject: 'Welcome to Elegance by Sconia — New Login Credentials',
        html: `<p>Hi ${user.name},</p><p>Your invitation has been resent. Your new temporary password is: <strong>${tempPassword}</strong></p><p>Please log in and change your password immediately.</p>`,
    }).catch((err) => logger.error('Resend invitation email failed for %s: %o', user.email, err));

    return strip(updated!);
}

export async function cancelInvitation(id: string): Promise<void> {
    const user = await User.query().findById(id).where({ is_owner: false });
    if (!user) throw Object.assign(new Error('Staff member not found.'), { status: 404, code: 'NOT_FOUND' });
    if (!user.must_change_password) throw Object.assign(new Error('Cannot cancel — invitation already accepted.'), { status: 409, code: 'CONFLICT' });

    await User.query().deleteById(id);
}

export async function toggleDeactivate(id: string): Promise<ReturnType<typeof strip>> {
    const user = await User.query().findById(id);
    if (!user) throw Object.assign(new Error('Staff member not found.'), { status: 404, code: 'NOT_FOUND' });
    if (user.is_owner) throw Object.assign(new Error('Cannot change the status of the owner account.'), { status: 400, code: 'FORBIDDEN' });

    const updated = await User.query().patchAndFetchById(id, { is_active: !user.is_active });
    return strip(updated!);
}
