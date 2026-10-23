import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteLayout from "@/components/SiteLayout";
import AgentationClient from "@/components/AgentationClient";

export const metadata: Metadata = {
  title: "АйДаУмничка — Платформа для репетиторов и онлайн-уроков",
  description: "Образовательная платформа центра «АйДаУмничка»: личные кабинеты преподавателя, ученика и родителя со встроенной видеосвязью.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
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
  maximumScale: 1,
  userScalable: false,
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* PWA и Web App Meta теги */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
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
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <SiteLayout>{children}</SiteLayout>
        <AgentationClient />
      </body>
    </html>
  );
}
