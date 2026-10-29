import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const acc1Url =
    process.env.LIVEKIT_URL_PRIMARY ||
    process.env.LIVEKIT_URL ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const acc1Key = process.env.LIVEKIT_API_KEY_PRIMARY || process.env.LIVEKIT_API_KEY;
  const acc1Secret = process.env.LIVEKIT_API_SECRET_PRIMARY || process.env.LIVEKIT_API_SECRET;

  const acc2Url = process.env.LIVEKIT_URL_SECONDARY;
  const acc2Key = process.env.LIVEKIT_API_KEY_SECONDARY;
  const acc2Secret = process.env.LIVEKIT_API_SECRET_SECONDARY;

  const account1Configured = Boolean(acc1Url && acc1Key && acc1Secret);
  const account2Configured = Boolean(acc2Url && acc2Key && acc2Secret);

  return NextResponse.json({
    enabled: account1Configured || account2Configured,
    mode: account1Configured && account2Configured ? 'dual_balanced_50_50' : 'single_account',
    totalFreeMinutesMonthly:
      (account1Configured ? 10000 : 0) + (account2Configured ? 10000 : 0),
    accounts: {
      account1: {
        id: 'account1',
        title: 'Аккаунт 1 (Основной пул)',
        isConfigured: account1Configured,
        serverUrl: acc1Url ? acc1Url.replace(/^wss?:\/\//, '').split('.')[0] + '...' : null,
        apiKeyMasked: acc1Key ? acc1Key.slice(0, 4) + '***' + acc1Key.slice(-3) : null,
        monthlyMinutes: 10000,
      },
      account2: {
        id: 'account2',
        title: 'Аккаунт 2 (Вторичный пул)',
        isConfigured: account2Configured,
        serverUrl: acc2Url ? acc2Url.replace(/^wss?:\/\//, '').split('.')[0] + '...' : null,
        apiKeyMasked: acc2Key ? acc2Key.slice(0, 4) + '***' + acc2Key.slice(-3) : null,
        monthlyMinutes: 10000,
      },
    },
  });
}
