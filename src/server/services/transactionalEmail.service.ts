import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { RECOVERY_EMAIL_HTML } from '../email/recoveryEmailTemplate';
import { EMAIL_LOGO_URL } from '../email/emailBrand';

function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

function getTransport() {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP не настроен на сервере (SMTP_USER / SMTP_PASS)');
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT === 587,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendPasswordRecoveryEmail(params: {
  to: string;
  actionLink: string;
}): Promise<void> {
  const html = RECOVERY_EMAIL_HTML.replaceAll('__EMAIL_LOGO_URL__', EMAIL_LOGO_URL)
    .replaceAll('{{ .ConfirmationURL }}', params.actionLink)
    .replaceAll('{{ .Email }}', params.to);

  const transport = getTransport();
  await transport.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
    to: params.to,
    subject: 'Восстановление пароля — АйДаУмничка',
    html,
  });
}

export function isTransactionalEmailConfigured(): boolean {
  return isSmtpConfigured();
}
