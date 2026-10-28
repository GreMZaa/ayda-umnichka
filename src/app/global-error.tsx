'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/errorTracker';

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, {
      component: 'RootGlobalError',
      additional: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="ru">
      <body className="bg-[#FFF7EE] min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#F2E0CF] shadow-lg text-center space-y-5">
          <div className="w-16 h-16 bg-[#FEE2E2] text-[#EF4444] rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#161F38]">
              Критический сбой приложения
            </h2>
            <p className="text-sm text-[#6B758E]">
              Приносим извинения за неудобства. Пожалуйста, перезагрузите страницу.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#5B63D3] hover:bg-[#4A51BF] text-white font-bold text-sm transition-all shadow-md active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Перезагрузить страницу</span>
          </button>
        </div>
      </body>
    </html>
  );
}
