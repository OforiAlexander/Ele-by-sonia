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

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string;
  attachments?: MailAttachment[];
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const { to, subject, html, text, cc, attachments } = options;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    cc,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
    attachments: attachments?.map((a) => ({
      filename:    a.filename,
      content:     a.content,
      contentType: a.contentType,
    })),
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
