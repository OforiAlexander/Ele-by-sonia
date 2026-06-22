import '../models/_config';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../services/logger';

export async function ensureOwnerAccount(): Promise<void> {
  const email = process.env.OWNER_EMAIL;
  const name = process.env.OWNER_NAME;
  const phone = process.env.OWNER_PHONE ?? '';
  const tempPassword = process.env.OWNER_TEMP_PASSWORD;

  if (!email || !tempPassword) {
    throw new Error('OWNER_EMAIL and OWNER_TEMP_PASSWORD must be set in environment to seed the owner account.');
  }

  const existing = await User.query().findOne({ email });

  if (existing) {
    logger.info('Owner account already exists — skipping.');
    return;
  }

  if (process.env.ALLOW_REGISTRATION !== 'true') {
    throw new Error('Set ALLOW_REGISTRATION=true in nodemon.json before running seed:owner.');
  }

  const password_hash = await bcrypt.hash(tempPassword, 12);

  await User.query().insert({
    id: uuidv4(),
    email,
    name,
    phone,
    password_hash,
    is_owner: true,
    is_active: true,
  });

  logger.info(`Owner account created: ${email}`);
}

if (require.main === module) {
  ensureOwnerAccount()
    .then(() => process.exit(0))
    .catch((err) => { logger.error(err); process.exit(1); });
}
