export interface LiveKitTokenResponse {
  success: boolean;
  token?: string;
  serverUrl?: string;
  account?: 'account1' | 'account2';
  accountName?: string;
  isConfigured: boolean;
  accountsAvailable?: {
    account1: boolean;
    account2: boolean;
  };
  error?: string;
}

export interface LiveKitStatusResponse {
  enabled: boolean;
  mode: 'dual_balanced_50_50' | 'single_account' | 'unconfigured';
  totalFreeMinutesMonthly: number;
  accounts: {
    account1: {
      id: string;
      title: string;
      isConfigured: boolean;
      serverUrl: string | null;
      apiKeyMasked: string | null;
      monthlyMinutes: number;
    };
    account2: {
      id: string;
      title: string;
      isConfigured: boolean;
      serverUrl: string | null;
      apiKeyMasked: string | null;
      monthlyMinutes: number;
    };
  };
}

export async function fetchLiveKitToken(params: {
  room: string;
  identity?: string;
  name?: string;
  accountOverride?: 'account1' | 'account2' | 'auto';
}): Promise<LiveKitTokenResponse> {
  try {
    const res = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: params.room,
        identity: params.identity,
        name: params.name,
        accountOverride: params.accountOverride === 'auto' ? undefined : params.accountOverride,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        isConfigured: false,
        error: `HTTP error: ${res.status}`,
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      isConfigured: false,
      error: err?.message || 'Ошибка запроса токена LiveKit',
    };
  }
}

export async function fetchLiveKitStatus(): Promise<LiveKitStatusResponse | null> {
  try {
    const res = await fetch('/api/livekit/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}
