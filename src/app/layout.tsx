import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AgentationClient from "@/components/AgentationClient";

export const metadata: Metadata = {
  title: "АйДаУмничка — Платформа для репетиторов и онлайн-уроков",
  description: "Образовательная платформа центра «АйДаУмничка»: личные кабинеты преподавателя, ученика и родителя со встроенной видеосвязью.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        {/* Предзагрузка скрипта Jitsi Meet External API для быстрого запуска видеоуроков */}
        <script src="https://meet.jit.si/external_api.js" async />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-600">АйДаУмничка</span>
              <span>© {new Date().getFullYear()} Образовательный центр. Все права защищены.</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Видеосервер: Активен
              </span>
              <span>Версия MVP 1.0</span>
            </div>
          </div>
        </footer>
        <AgentationClient />
      </body>
    </html>
  );
}
