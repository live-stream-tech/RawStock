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
          html, body {
            scrollbar-gutter: stable;
          }
          html, body, #root {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            background-color: #070F18;
          }
          /* iOS PWA: 100% だけだとアドレスバー周りで高さがずれることがある */
          @supports (height: 100dvh) {
            html, body, #root {
              min-height: 100dvh;
            }
          }
          @supports (-webkit-touch-callout: none) {
            html, body, #root {
              min-height: -webkit-fill-available;
            }
          }
          /* アプリ本体をスキャンラインより手前に（タブバーが消えるのを防ぐ） */
          #root {
            position: relative;
            z-index: 1;
            isolation: isolate;
          }
          /* PC Web: 細身シアン系スクロールバー。
             #root 配下で詳細度を上げ、RN Web が付ける .class::-webkit-scrollbar{display:none} を潰す */
          @media (min-width: 768px) and (pointer: fine) {
            #root * {
              scrollbar-width: thin !important;
              scrollbar-color: rgba(0, 255, 204, 0.45) rgba(5, 5, 5, 0.8) !important;
            }
            #root *::-webkit-scrollbar {
              display: block !important;
              width: 10px !important;
              height: 10px !important;
            }
            #root *::-webkit-scrollbar-track {
              background: rgba(5, 5, 5, 0.75) !important;
              border-radius: 8px;
            }
            #root *::-webkit-scrollbar-thumb {
              background: rgba(0, 255, 204, 0.32) !important;
              border-radius: 8px;
              border: 2px solid rgba(5, 5, 5, 0.85);
            }
            #root *::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 255, 204, 0.55) !important;
            }
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
            /* #root(z-index:1) の下に回し、タブバー等が隠れないようにする */
            z-index: 0;
          }
          /*
           * body に safe-area パディングを付けると、PWA スタンドアロンで
           * #root の flex 高さと position:absolute タブバーの位置がずれ、
           * フッターが画面外に見えることがある。余白は RN（タブバー・各画面）側で付ける。
           */
          body {
            margin: 0;
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
