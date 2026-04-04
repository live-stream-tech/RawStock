# ネイティブライブ・フィルター方針（WHIP / Cloudflare Stream）

RawStock のライブ送信は Cloudflare Stream の **WHIP**（WebRTC ingest）を使う。ブラウザでは [`lib/live/whip.ts`](../lib/live/whip.ts) が `RTCPeerConnection` にカメラの `MediaStream` を載せて SDP を POST する。

## 方針変更（SNOW について）

**ビューティー AR 系 SDK（旧ドキュメントでは SNOW を例示）は現状の既定パスとしない。**  
実装コスト・`MediaStream` への載せ替え保証・ライセンスを踏まえ、次の優先順位で進める。

| 優先 | 内容 | 備考 |
|------|------|------|
| A | **`react-native-webrtc` + カメラで素の `MediaStream` → 既存 `connectWHIP`** | 低遅延寄り。まず「モバイルからも配信できる」を達成する主経路。Expo では prebuild / 開発ビルドが前提。 |
| B | **軽い映像加工** | [`react-native-vision-camera`](https://react-native-vision-camera.com/) の Frame Processor やコミュニティプラグインを候補とする。品質・メンテは自己責任。 |
| C | **RTMPS インジェスト** | DB の `streams` に `rtmpsUrl` / `rtmpsStreamKey` がある。`MediaStream` 不要だが遅延は WebRTC より大きくなりがち。 |
| Web | **素プレビュー**（[`app/broadcast.tsx`](../app/broadcast.tsx)） | ライブ前の CSS フィルター UI は撤去済み。加工が要る場合は B（Vision Camera 等）や Insertable Streams を別途検討。 |

旧ファイル名での参照用: [`SNOW_SDK_INTEGRATION.md`](./SNOW_SDK_INTEGRATION.md)（リダイレクトのみ）。

## 遠隔セッション・演奏同期

**複数拠点での「ノリの合った同時演奏」や厳密な同期は現状スコープ外。** ネットワーク遅延と一般配信スタックだけでは成立が難しい。  
**研究・実装に協力してくれるコントリビュータを募集する**（アプリ内「お知らせ」や開発者向けチャネルで案内）。

## Expo / EAS

- **Expo Go では不可。** `npx expo prebuild` 後の **開発ビルド**（EAS Build 等）が前提。
- [`plugins/withLiveBroadcastPermissions.js`](../plugins/withLiveBroadcastPermissions.js) がカメラ・マイクの用途文案を注入する。

## アプリ内の接続点

| 画面 | ファイル | 備考 |
|------|-----------|------|
| ライブ配信（ホスト） | [`app/broadcast.tsx`](../app/broadcast.tsx) | Web は `getUserMedia` + WHIP。ネイティブはプレビューのみ。`acquireBroadcastMediaStream`（[`lib/live/nativeBroadcastStream.ts`](../lib/live/nativeBroadcastStream.ts)）で `MediaStream` を供給できれば WHIP 共有可能。 |
| メンター WHIP | [`app/mentor-room/[id].tsx`](../app/mentor-room/[id].tsx) | Web のみ `connectWHIP`。ネイティブは上記パイプライン整備後に同ユーティリティを共有。 |

## プライバシー・ストア審査

第三者のカメラ・映像 SDK を入れる場合は、**プライバシーラベル・ポリシー**にデータ取り扱いを追記する。バージョンは Pod / Gradle / `package.json` でピン留め推奨。

## コンポーネントバージョン（手動メモ）

| コンポーネント | バージョン | 更新日 |
|----------------|------------|--------|
| react-native-webrtc | _TBD_ | |
| react-native-vision-camera | _TBD_ | |
