"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import BrandLogo from "@/components/BrandLogo";
import { getMainSiteUrl } from "@/lib/config";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Личные кабинеты и веб-комната — работают в полноэкранном режиме без внешней шапки и подвала
  const isCabinet =
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/room") ||
    pathname.startsWith("/admin");

  if (isCabinet) {
    return (
      <main className="w-full h-[100dvh] overflow-hidden p-0 m-0 bg-[#eef1f5]">
        {children}
      </main>
    );
  }

  // Страница входа — ровно 1 экран без прокрутки
  const isLoginPage = pathname === "/login";
  if (isLoginPage) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-0 overflow-y-auto lg:overflow-hidden py-1 sm:py-2">
          {children}
        </main>
      </div>
    );
  }

  // Для публичных страниц сохраняем стандартную шапку и подвал
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 sm:py-8 text-xs sm:text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <BrandLogo variant="compact" size="xs" href={getMainSiteUrl("/?guest=1")} />
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>© {new Date().getFullYear()} Все права защищены.</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <a href="tel:+79954854667" className="font-bold text-slate-700 hover:text-blue-600 transition">
              8 995 485 46 67
            </a>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">Онлайн-уроки по всей России</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
