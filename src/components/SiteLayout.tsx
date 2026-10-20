"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Личные кабинеты и веб-комната — работают в полноэкранном режиме Telegram Web без внешней шапки и подвала
  const isCabinet =
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/room") ||
    pathname.startsWith("/admin");

  if (isCabinet) {
    return (
      <main className="w-full h-[100dvh] overflow-hidden p-0 m-0 bg-[#eef3f7]">
        {children}
      </main>
    );
  }

  // Для публичных страниц и страницы входа сохраняем стандартную шапку и подвал
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs sm:text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <span className="font-bold text-blue-600">АйДаУмничка</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>© {new Date().getFullYear()} Образовательный центр. Все права защищены.</span>
          </div>
          <div className="text-xs text-slate-400">
            Онлайн-уроки с репетитором по всей России
          </div>
        </div>
      </footer>
    </div>
  );
}
