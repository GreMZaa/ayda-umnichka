import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

interface LiveKitAccount {
  id: 'account1' | 'account2';
  name: string;
  url?: string;
  apiKey?: string;
  apiSecret?: string;
}

function getAccounts(): { account1: LiveKitAccount; account2: LiveKitAccount } {
  const account1: LiveKitAccount = {
    id: 'account1',
    name: 'Аккаунт 1 (Основной)',
    url:
      process.env.LIVEKIT_URL_PRIMARY ||
      process.env.LIVEKIT_URL ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY_PRIMARY || process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET_PRIMARY || process.env.LIVEKIT_API_SECRET,
  };

  const account2: LiveKitAccount = {
    id: 'account2',
    name: 'Аккаунт 2 (Вторичный)',
    url: process.env.LIVEKIT_URL_SECONDARY,
    apiKey: process.env.LIVEKIT_API_KEY_SECONDARY,
    apiSecret: process.env.LIVEKIT_API_SECRET_SECONDARY,
  };

  return { account1, account2 };
}

function isAccountValid(acc: LiveKitAccount): boolean {
  return Boolean(acc.url && acc.apiKey && acc.apiSecret);
}

// Consistent hashing by room name to balance free quota 50/50 across both accounts
function selectAccountByRoom(room: string, acc1Valid: boolean, acc2Valid: boolean): 'account1' | 'account2' {
  if (acc1Valid && !acc2Valid) return 'account1';
  if (!acc1Valid && acc2Valid) return 'account2';
  if (!acc1Valid && !acc2Valid) return 'account1';

  let hash = 0;
  for (let i = 0; i < room.length; i++) {
    hash = (hash << 5) - hash + room.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2 === 0 ? 'account1' : 'account2';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { room, identity, name, accountOverride } = body;

    if (!room) {
      return NextResponse.json({ success: false, error: 'Параметр room обязателен' }, { status: 400 });
    }

    const { account1, account2 } = getAccounts();
    const acc1Valid = isAccountValid(account1);
    const acc2Valid = isAccountValid(account2);

    if (!acc1Valid && !acc2Valid) {
      return NextResponse.json({
        success: false,
        isConfigured: false,
        error: 'LiveKit API ключи не настроены в .env',
        accountsAvailable: { account1: false, account2: false },
      });
    }

    let selectedKey: 'account1' | 'account2';
    if (accountOverride === 'account2' && acc2Valid) {
      selectedKey = 'account2';
    } else if (accountOverride === 'account1' && acc1Valid) {
      selectedKey = 'account1';
    } else {
      selectedKey = selectAccountByRoom(room, acc1Valid, acc2Valid);
    }

    const activeAccount = selectedKey === 'account2' ? account2 : account1;

    const participantIdentity =
      identity || `user_${Math.random().toString(36).substring(2, 9)}`;
    const participantName = name || participantIdentity;

    const at = new AccessToken(activeAccount.apiKey!, activeAccount.apiSecret!, {
      identity: participantIdentity,
      name: participantName,
      ttl: '6h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      serverUrl: activeAccount.url,
      account: selectedKey,
      accountName: activeAccount.name,
      isConfigured: true,
      accountsAvailable: {
        account1: acc1Valid,
        account2: acc2Valid,
      },
    });
  } catch (err: any) {
    console.error('[LiveKit Token Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Сбой генерации токена LiveKit' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'default-room';
  const identity = searchParams.get('identity') || `user_${Math.random().toString(36).substring(2, 9)}`;
  const name = searchParams.get('name') || identity;
  const accountOverride = searchParams.get('account') as 'account1' | 'account2' | null;

  const { account1, account2 } = getAccounts();
  const acc1Valid = isAccountValid(account1);
  const acc2Valid = isAccountValid(account2);

  if (!acc1Valid && !acc2Valid) {
    return NextResponse.json({
      success: false,
      isConfigured: false,
      error: 'LiveKit API ключи не настроены в .env',
      accountsAvailable: { account1: false, account2: false },
    });
  }

  let selectedKey: 'account1' | 'account2';
  if (accountOverride === 'account2' && acc2Valid) {
    selectedKey = 'account2';
  } else if (accountOverride === 'account1' && acc1Valid) {
    selectedKey = 'account1';
  } else {
    selectedKey = selectAccountByRoom(room, acc1Valid, acc2Valid);
  }

  const activeAccount = selectedKey === 'account2' ? account2 : account1;

  try {
    const at = new AccessToken(activeAccount.apiKey!, activeAccount.apiSecret!, {
      identity,
      name,
      ttl: '6h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      serverUrl: activeAccount.url,
      account: selectedKey,
      accountName: activeAccount.name,
      isConfigured: true,
      accountsAvailable: {
        account1: acc1Valid,
        account2: acc2Valid,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Сбой генерации токена LiveKit' },
      { status: 500 }
    );
  }
}
