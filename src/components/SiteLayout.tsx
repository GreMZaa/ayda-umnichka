"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Личные кабинеты и веб-комната — работают в полноэкранном режиме без внешней шапки и подвала
  const isCabinet =
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/parent") ||
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

  // Для публичных страниц и страницы входа сохраняем стандартную шапку и подвал
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main
        className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 ${
          isHome ? "py-1 sm:py-6 flex flex-col justify-center" : "py-6"
        }`}
      >
        {children}
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-2 sm:py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="font-bold text-blue-600">АйДаУмничка</span>
            <span className="text-slate-300">•</span>
            <span>© {new Date().getFullYear()} Все права защищены.</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <a href="tel:+79954854667" className="hover:text-blue-600 font-semibold transition">
              8 995 485 46 67
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
