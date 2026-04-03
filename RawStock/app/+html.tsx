import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050505" />
        <meta name="application-name" content="RawStock" />
        <meta name="description" content="Underground music live streaming & paid video marketplace" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RawStock" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Courier+Prime:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style>{`
          html, body, #root {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            background-color: #070F18;
          }
          * { font-family: 'Courier Prime', monospace; }
          h1, h2, h3, h4, h5, h6, .display { font-family: 'Barlow Condensed', sans-serif !important; }
          /* スキャンライン効果 */
          body::after {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 204, 0.015) 2px,
              rgba(0, 255, 204, 0.015) 4px
            );
            pointer-events: none;
            z-index: 9999;
          }
          /* PWA スタンドアロン時: ノッチ・ステータスバー分の余白 */
          body {
            padding-top: env(safe-area-inset-top, 0px);
            padding-left: env(safe-area-inset-left, 0px);
            padding-right: env(safe-area-inset-right, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
