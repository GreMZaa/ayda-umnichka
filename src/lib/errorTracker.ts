/**
 * Centralized Error Tracker for AyDaUmnichka Platform
 * Captures exceptions and reports them to the monitoring backend.
 */

export interface ErrorContext {
  userId?: string | null;
  role?: string | null;
  path?: string;
  component?: string;
  additional?: Record<string, any>;
}

const lastReportTimes: number[] = [];
const reportedSignatures = new Map<string, number>();

export async function reportClientError(error: unknown, context: ErrorContext = {}) {
  try {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const now = Date.now();

    // 1. Sliding window rate limit: max 5 reports per 60 seconds per client
    while (lastReportTimes.length > 0 && now - lastReportTimes[0] > 60000) {
      lastReportTimes.shift();
    }
    if (lastReportTimes.length >= 5) {
      return; // Throttled to protect Vercel Serverless quotas
    }

    // 2. Exact signature deduplication: ignore identical errors within 30 seconds
    const signature = `${errObj.name}:${errObj.message}:${context.path || ''}`;
    const lastSeen = reportedSignatures.get(signature);
    if (lastSeen && now - lastSeen < 30000) {
      return;
    }
    reportedSignatures.set(signature, now);
    lastReportTimes.push(now);

    let currentUserId = context.userId;
    let currentRole = context.role;

    if (typeof window !== 'undefined') {
      if (!currentUserId) {
        currentUserId =
          localStorage.getItem('aida_auth_user_id') ||
          localStorage.getItem('aida_user_id') ||
          null;
      }
      if (!currentRole) {
        currentRole = localStorage.getItem('aida_active_role') || null;
      }
    }

    const payload = {
      message: errObj.message || 'Unknown Error',
      name: errObj.name || 'Error',
      stack: errObj.stack ? errObj.stack.slice(0, 2000) : null,
      path: context.path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      userId: currentUserId,
      role: currentRole,
      component: context.component || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      timestamp: new Date().toISOString(),
      additional: context.additional || null,
    };

    // Send asynchronously without blocking the user
    if (typeof fetch !== 'undefined') {
      fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silent catch to prevent recursive error handling
      });
    }

    // Always output to developer console in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorTracker Captured]:', payload);
    }
  } catch {
    // Fail-safe
  }
}
