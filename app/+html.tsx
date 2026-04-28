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
        <meta name="google-site-verification" content="HUXiBuwwGVo9sqbntmcyyHIqOoMTIEVhWh9E1mYR5V8" />
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
          html {
            height: 100%;
          }
          html, body {
            scrollbar-gutter: stable;
          }
          body {
            display: flex;
            flex-direction: column;
            min-height: 100%;
            overflow-x: hidden;
            background-color: #070F18;
            margin: 0;
            box-sizing: border-box;
          }
          #root {
            flex: 1 1 auto;
            min-height: 0;
            /* Do not scroll the whole shell — inner screens own ScrollViews. Keeps PWA tab bar fixed. */
            overflow-x: hidden;
            overflow-y: hidden;
            display: flex;
            flex-direction: column;
            background-color: #070F18;
            position: relative;
            z-index: 1;
            isolation: isolate;
          }
          /* iOS PWA: avoid viewport-height mismatch around browser chrome */
          @supports (height: 100dvh) {
            body {
              min-height: 100dvh;
            }
          }
          @supports (-webkit-touch-callout: none) {
            body {
              min-height: -webkit-fill-available;
            }
          }
          /* Web: force visible, grabbable scrollbars across RN ScrollViews. */
          #root, #root * {
            scrollbar-width: auto !important;
            scrollbar-color: rgba(0, 255, 204, 0.78) rgba(5, 5, 5, 0.92) !important;
          }
          #root::-webkit-scrollbar,
          #root *::-webkit-scrollbar {
            display: block !important;
            width: 16px !important;
            height: 16px !important;
          }
          #root::-webkit-scrollbar-track,
          #root *::-webkit-scrollbar-track {
            background: rgba(5, 5, 5, 0.9) !important;
            border-radius: 10px;
          }
          #root::-webkit-scrollbar-thumb,
          #root *::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 204, 0.7) !important;
            border-radius: 10px;
            border: 3px solid rgba(5, 5, 5, 0.95);
            min-height: 48px;
          }
          #root::-webkit-scrollbar-thumb:hover,
          #root *::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 255, 204, 0.9) !important;
          }
          * { font-family: 'Courier Prime', monospace; }
          h1, h2, h3, h4, h5, h6, .display { font-family: 'Barlow Condensed', sans-serif !important; }
          /* Scanline overlay effect */
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
            /* Keep overlay beneath #root to avoid covering tab bars. */
            z-index: 0;
          }
          /*
           * Legal links live inside each screen (e.g. Top tab) with correct padding above the fixed tab bar.
           * A static HTML footer here duplicated links and sat under/over the RN tab bar on Safari & PWA.
           */
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
