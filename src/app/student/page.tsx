'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function StudentPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    let targetId = '';
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qId = sp.get('id');
      if (qId) targetId = qId;
    }

    if (!targetId) {
      targetId =
        localStorage.getItem('aida_auth_user_id') ||
        document.cookie.match(/(?:^|; )aida_auth_user_id=([^;]*)/)?.[1] ||
        localStorage.getItem('aida_user_id') ||
        document.cookie.match(/(?:^|; )aida_user_id=([^;]*)/)?.[1] ||
        '';
    }

    if (targetId) {
      router.replace(`/${encodeURIComponent(targetId)}`);
    } else {
      router.replace('/login?redirect=/student');
    }
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-coralAccent animate-spin" />
        <p className="text-xs font-bold text-[#6B758E]">Переход в личный кабинет ученика...</p>
      </div>
    </div>
  );
}
