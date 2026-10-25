import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentationToolbar from "@/components/AgentationToolbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "АйДаУмничка — Детский развивающий центр (Тольятти)",
  description: "Образовательная онлайн-платформа детского центра «АйДаУмничка» в г. Тольятти: P2P видеоуроки, интерактивная доска, чаты и прозрачный учет баланса занятий.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FFF7EE] text-[#161F38] flex flex-col antialiased selection:bg-[#FDEEDC] selection:text-[#161F38]"
      >
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white/80 border-t border-[#F4E4D3] py-8 text-center text-xs text-ink-500">
          <p className="font-semibold text-ink-700">© 2026 Детский центр развития речи и интеллекта «АйДаУмничка» (г. Тольятти)</p>
          <p className="mt-1 text-ink-400">P2P WebRTC видеосвязь без сторонних шлюзов • Устойчивость к белым спискам РФ • On-Demand уроки</p>
        </footer>
        <AgentationToolbar />
      </body>
    </html>
  );
}
