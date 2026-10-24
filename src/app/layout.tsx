import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "АйДаУмничка — Детский развивающий центр (Тольятти)",
  description: "Образовательная онлайн-платформа детского центра «АйДаУмничка» в г. Тольятти: P2P видеоуроки, интерактивная доска, чаты и учет баланса занятий.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>© 2026 Детский центр развития речи и интеллекта «АйДаУмничка» (г. Тольятти)</p>
          <p className="mt-1">P2P WebRTC видеосвязь без сторонних шлюзов • Устойчивость к белым спискам РФ</p>
        </footer>
      </body>
    </html>
  );
}
