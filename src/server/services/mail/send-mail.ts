import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import Message from '../../models/Message';
import logger from '../logger';

if (!process.env.MAILGUN_API_KEY)  throw new Error('MAILGUN_API_KEY is not set');
if (!process.env.MAILGUN_DOMAIN)   throw new Error('MAILGUN_DOMAIN is not set');

const mg = new Mailgun(FormData).client({
    username: 'api',
    key:      process.env.MAILGUN_API_KEY,
    url:      process.env.MAILGUN_API_URL ?? 'https://api.mailgun.net',
});

export interface MailAttachment {
    filename:    string;
    content:     Buffer;
    contentType: string;
}

export interface SendMailOptions {
    to:           string;
    subject:      string;
    html:         string;
    text?:        string;
    cc?:          string;
    attachments?: MailAttachment[];
}

export async function sendMail(options: SendMailOptions): Promise<void> {
    const { to, subject, html, text, cc, attachments } = options;

    await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
        from:    process.env.MAIL_FROM!,
        to:      [to],
        ...(cc ? { cc: [cc] } : {}),
        subject,
        html,
        text:    text ?? html.replace(/<[^>]+>/g, ''),
        attachment: attachments?.map((a) => ({
            filename:    a.filename,
            data:        a.content,
            contentType: a.contentType,
        })),
    });

    logger.info(`Email sent to ${to}: ${subject}`);

    Message.query().insert({
        type:        'email',
        destination: to,
        subject,
        content:     text ?? html.replace(/<[^>]+>/g, ''),
    }).catch((err) => logger.error('Failed to log sent email to messages table', { error: err?.message }));
}
