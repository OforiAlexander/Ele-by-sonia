import { Resend } from 'resend';
import Message from '../../models/Message';
import logger from '../logger';

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to,
    ...(cc ? { cc } : {}),
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ''),
    attachments: attachments?.map((a) => ({
      filename:    a.filename,
      content:     a.content.toString('base64'),
      contentType: a.contentType,
    })),
  });

  if (error) throw new Error(error.message);

  logger.info(`Email sent to ${to}: ${subject}`);

  Message.query().insert({
    type:        'email',
    destination: to,
    subject,
    content:     text ?? html.replace(/<[^>]+>/g, ''),
  }).catch((err) => logger.error('Failed to log sent email to messages table', { error: err?.message }));
}
