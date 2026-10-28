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

export async function reportClientError(error: unknown, context: ErrorContext = {}) {
  try {
    const errObj = error instanceof Error ? error : new Error(String(error));

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
