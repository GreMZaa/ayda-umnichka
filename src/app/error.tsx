'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { reportClientError } from '@/lib/errorTracker';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, {
      component: 'AppRouterError',
      additional: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFF7EE] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#F2E0CF] shadow-lg text-center space-y-5">
        <div className="w-16 h-16 bg-[#FEE2E2] text-[#EF4444] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#161F38]">
            Ой! Что-то пошло не так
          </h2>
          <p className="text-sm text-[#6B758E]">
            Произошла небольшая заминка при загрузке страницы. Наши педагоги и инженеры уже получили уведомление об ошибке.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#5B63D3] hover:bg-[#4A51BF] text-white font-bold text-sm transition-all shadow-md active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Попробовать снова</span>
          </button>

          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#F6F7FA] hover:bg-[#EEF0F5] text-[#161F38] font-bold text-sm transition-all border border-[#E2E6EE] active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>На главную</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
