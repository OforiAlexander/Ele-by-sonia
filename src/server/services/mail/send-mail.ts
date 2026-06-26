import nodemailer from 'nodemailer';
import Message from '../../models/Message';
import logger from '../logger';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const { to, subject, html, text } = options;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
  });

  logger.info(`Email sent to ${to}: ${subject}`);

  // Log to DB after the send succeeds — a DB failure must not fail the send
  Message.query().insert({
    type: 'email',
    destination: to,
    subject,
    content: text ?? html.replace(/<[^>]+>/g, ''),
  }).catch((err) => logger.error('Failed to log sent email to messages table: %o', err));
}
