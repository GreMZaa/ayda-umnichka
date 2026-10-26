'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isLogin = pathname === '/login';
  const isRoom = pathname.startsWith('/room');

  if (isHome || isLogin || isRoom) {
    return (
      <main className="flex-1 w-full overflow-hidden flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {children}
    </main>
  );
}
