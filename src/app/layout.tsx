import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AgentationClient from "@/components/AgentationClient";

export const metadata: Metadata = {
  title: "АйДаУмничка — Платформа для репетиторов и онлайн-уроков",
  description: "Образовательная платформа центра «АйДаУмничка»: личные кабинеты преподавателя, ученика и родителя со встроенной видеосвязью.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "АйДаУмничка",
  },
  applicationName: "АйДаУмничка",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        {/* PWA и Web App Meta теги */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="АйДаУмничка" />
        <meta name="theme-color" content="#2563eb" />

        {/* Предзагрузка скрипта Jitsi Meet External API для быстрого запуска видеоуроков */}
        <script src="https://meet.jit.si/external_api.js" async />

        {/* Регистрация Service Worker для PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
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
        <AgentationClient />
      </body>
    </html>
  );
}
