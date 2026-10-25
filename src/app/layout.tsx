import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContentWrapper from "@/components/ContentWrapper";
import AgentationToolbar from "@/components/AgentationToolbar";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://ayda-umnichka.vercel.app'),
  title: "АйДаУмничка — Детский развивающий центр (Тольятти)",
  description: "Образовательная онлайн-платформа детского центра «АйДаУмничка» в г. Тольятти: P2P видеоуроки, интерактивная доска, чаты и прозрачный учет баланса занятий.",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "АйДаУмничка — Детский развивающий центр (Тольятти)",
    description: "Образовательная онлайн-платформа детского центра «АйДаУмничка» в г. Тольятти",
    images: ['/images/logo-official.png'],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#FFF7EE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origError = console.error;
                console.error = function() {
                  var msg = arguments[0];
                  if (typeof msg === 'string' && (msg.indexOf('bis_skin_checked') !== -1 || msg.indexOf('hydrated but some attributes') !== -1)) {
                    return;
                  }
                  origError.apply(console, arguments);
                };

                var clean = function(node) {
                  if (node && node.nodeType === 1) {
                    if (node.hasAttribute('bis_skin_checked')) {
                      node.removeAttribute('bis_skin_checked');
                    }
                    for (var i = 0; i < node.children.length; i++) {
                      clean(node.children[i]);
                    }
                  }
                };

                var obs = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                      m.target.removeAttribute('bis_skin_checked');
                    } else if (m.addedNodes) {
                      for (var j = 0; j < m.addedNodes.length; j++) {
                        clean(m.addedNodes[j]);
                      }
                    }
                  }
                });
                obs.observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FFF7EE] text-[#161F38] flex flex-col antialiased selection:bg-[#FDEEDC] selection:text-[#161F38]"
      >
        <Navbar />
        <ContentWrapper>{children}</ContentWrapper>
        <Footer />
        <AgentationToolbar />
      </body>
    </html>
  );
}
