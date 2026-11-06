#!/usr/bin/env node
/**
 * Push Russian HTML email templates to linked Supabase project (Management API).
 * Requires: SUPABASE_ACCESS_TOKEN, optional PROJECT_REF (default ffuaihmewlksjshnnlly)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAydaEmail } from '../supabase/templates/email-shell.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const templatesDir = join(root, 'supabase', 'templates');

const PROJECT_REF = process.env.PROJECT_REF || 'ffuaihmewlksjshnnlly';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)');
  process.exit(1);
}

const CONFIRM_URL = '{{ .ConfirmationURL }}';

const definitions = {
  recovery: {
    subject: 'Восстановление пароля — АйДаУмничка',
    file: 'recovery.html',
    html: buildAydaEmail({
      preheader: 'Задайте новый пароль для входа в личный кабинет',
      title: 'Восстановление пароля',
      paragraphs: [
        'Здравствуйте!',
        'Мы получили запрос на смену пароля для адреса <strong style="color:#161F38;">{{ .Email }}</strong>.',
        'Нажмите кнопку ниже — откроется защищённая страница, где можно задать новый пароль. Ссылка действует ограниченное время и подходит для одного использования.',
        'Если вы не запрашивали смену пароля, просто проигнорируйте это письмо — ваш пароль останется прежним.',
      ],
      cta: { label: 'Задать новый пароль', href: CONFIRM_URL },
    }),
  },
  confirmation: {
    subject: 'Подтвердите email — АйДаУмничка',
    file: 'confirmation.html',
    html: buildAydaEmail({
      preheader: 'Подтвердите адрес почты и завершите регистрацию',
      title: 'Подтверждение email',
      paragraphs: [
        'Спасибо за регистрацию в «АйДаУмничка»!',
        'Чтобы завершить создание аккаунта для <strong style="color:#161F38;">{{ .Email }}</strong>, подтвердите адрес почты — нажмите кнопку ниже.',
      ],
      cta: { label: 'Подтвердить email', href: CONFIRM_URL },
    }),
  },
  magic_link: {
    subject: 'Вход в личный кабинет — АйДаУмничка',
    file: 'magic_link.html',
    html: buildAydaEmail({
      preheader: 'Одноразовая ссылка для входа',
      title: 'Вход без пароля',
      paragraphs: [
        'Вы запросили ссылку для входа в личный кабинет.',
        'Нажмите кнопку ниже — вы сразу окажетесь в системе. Ссылка скоро перестанет действовать и работает один раз.',
      ],
      cta: { label: 'Войти в кабинет', href: CONFIRM_URL },
    }),
  },
  invite: {
    subject: 'Приглашение в АйДаУмничка',
    file: 'invite.html',
    html: buildAydaEmail({
      preheader: 'Примите приглашение и создайте аккаунт',
      title: 'Вас пригласили',
      paragraphs: [
        'Вам открыли доступ к личному кабинету «АйДаУмничка».',
        'Нажмите кнопку ниже, чтобы принять приглашение и задать пароль для входа.',
      ],
      cta: { label: 'Принять приглашение', href: CONFIRM_URL },
    }),
  },
  email_change: {
    subject: 'Подтвердите новый email — АйДаУмничка',
    file: 'email_change.html',
    html: buildAydaEmail({
      preheader: 'Подтвердите смену адреса почты',
      title: 'Смена email',
      paragraphs: [
        'Вы запросили смену email для вашего аккаунта.',
        'Новый адрес: <strong style="color:#161F38;">{{ .NewEmail }}</strong>.',
        'Подтвердите его, нажав кнопку ниже. Если это были не вы — проигнорируйте письмо.',
      ],
      cta: { label: 'Подтвердить новый email', href: CONFIRM_URL },
    }),
  },
  reauthentication: {
    subject: 'Код подтверждения — АйДаУмничка',
    file: 'reauthentication.html',
    html: buildAydaEmail({
      preheader: 'Код для подтверждения действия',
      title: 'Код подтверждения',
      paragraphs: [
        'Для продолжения введите одноразовый код:',
        '<span style="display:inline-block;margin-top:8px;padding:12px 20px;background:#FFFBF7;border:2px dashed #F2C79E;border-radius:12px;font-size:28px;font-weight:800;letter-spacing:0.2em;color:#161F38;font-family:ui-monospace,Consolas,monospace;">{{ .Token }}</span>',
        'Код действует недолго. Никому его не сообщайте.',
      ],
      footerNote: 'Если вы не выполняли действие в кабинете, смените пароль и свяжитесь с поддержкой.',
    }),
  },
  password_changed_notification: {
    subject: 'Пароль изменён — АйДаУмничка',
    file: 'password_changed_notification.html',
    html: buildAydaEmail({
      preheader: 'Пароль вашего аккаунта был изменён',
      title: 'Пароль изменён',
      paragraphs: [
        'Пароль для входа в личный кабинет «АйДаУмничка» был успешно изменён.',
        'Если это сделали не вы, срочно восстановите доступ через «Забыли пароль?» на странице входа и свяжитесь с администратором.',
      ],
      footerNote: 'Это уведомление безопасности отправлено автоматически.',
    }),
  },
};

mkdirSync(templatesDir, { recursive: true });
for (const def of Object.values(definitions)) {
  writeFileSync(join(templatesDir, def.file), def.html, 'utf8');
}

const payload = {};
for (const [key, def] of Object.entries(definitions)) {
  payload[`mailer_subjects_${key}`] = def.subject;
  payload[`mailer_templates_${key}_content`] = def.html;
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error('PATCH failed', res.status, text);
  process.exit(1);
}

console.log('OK: Russian email templates applied to project', PROJECT_REF);
console.log('Updated:', Object.keys(definitions).join(', '));
