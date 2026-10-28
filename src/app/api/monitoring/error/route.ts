import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ErrorPayload {
  message: string;
  name?: string;
  stack?: string;
  path?: string;
  userId?: string | null;
  role?: string | null;
  component?: string | null;
  userAgent?: string;
  timestamp?: string;
  additional?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const body: ErrorPayload = await req.json();

    const timestamp = body.timestamp || new Date().toISOString();
    const structuredLog = {
      level: 'ERROR',
      service: 'ayda-umnichka',
      type: 'CLIENT_OR_RUNTIME_EXCEPTION',
      error: {
        name: body.name || 'Error',
        message: body.message,
        stack: body.stack,
      },
      context: {
        path: body.path || '/',
        userId: body.userId || 'anonymous',
        role: body.role || 'guest',
        component: body.component || 'global',
        userAgent: body.userAgent,
      },
      timestamp,
    };

    // 1. Structured JSON output for cloud log aggregators (Vercel / Datadog / CloudWatch)
    console.error(JSON.stringify(structuredLog));

    // 2. Instant Telegram Alerting (if configured)
    const tgBotToken = process.env.TELEGRAM_ALERT_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_ALERT_CHAT_ID;

    if (tgBotToken && tgChatId) {
      const tgMessage = [
        `🚨 *[АЙДАУМНИЧКА: ОШИБКА]*`,
        `📍 *Страница:* \`${body.path || '/'}\``,
        `👤 *Пользователь:* \`${body.userId || 'Гость'}\` (${body.role || 'нет'})`,
        `⚠️ *Ошибка:* \`${body.message}\``,
        body.component ? `🧩 *Компонент:* ${body.component}` : '',
        `⏱ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Samara' })}`,
        body.stack ? `\n\`\`\`\n${body.stack.slice(0, 500)}\n\`\`\`` : '',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: tgMessage,
            parse_mode: 'Markdown',
          }),
        });
      } catch (tgErr) {
        console.warn('Telegram alert delivery failed:', tgErr);
      }
    }

    return NextResponse.json({ success: true, logged: true }, { status: 200 });
  } catch (err: any) {
    console.error('Monitoring error handler error:', err);
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
