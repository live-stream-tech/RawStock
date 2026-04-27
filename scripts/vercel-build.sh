#!/usr/bin/env sh
set -eu

# rawstock-lp はネットワーク不要: リポジトリ同梱の vendor/rawstock-lp をビルドする
VENDOR_LP="${RAWSTOCK_LP_VENDOR:-vendor/rawstock-lp}"
test -d "$VENDOR_LP" || {
  echo "Missing $VENDOR_LP — add vendored rawstock-lp (upstream repo, no .git) under vendor/rawstock-lp" >&2
  exit 1
}

node scripts/patch-rawstock-lp-for-embed.mjs "$VENDOR_LP"
cp scripts/rawstock-lp-override/Home-JP.tsx "$VENDOR_LP/client/src/pages/Home-JP.tsx"
(
  cd "$VENDOR_LP"
  npx --yes pnpm@10.4.1 install --frozen-lockfile 2>/dev/null || npx --yes pnpm@10.4.1 install
  npx --yes pnpm@10.4.1 exec vite build
)

npx expo export --platform web
rm -f dist/lp.html dist/lp-standalone.html
node scripts/inject-sw-version.js
cp public/favi.png dist/favi.png
cp public/teamz.html dist/teamz.html
cp public/haikeihaikei.png dist/haikeihaikei.png
cp -r public/jeeliz dist/jeeliz

rm -rf dist/lp
mkdir -p dist/lp
cp -R "$VENDOR_LP/dist/public/." dist/lp/
