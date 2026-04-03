# SNOW SDK 連携（ライブ配信・WHIP）

RawStock のライブは Cloudflare Stream の **WHIP** でアップロードする。ブラウザでは [`lib/live/whip.ts`](../lib/live/whip.ts) が `RTCPeerConnection` にカメラの `MediaStream` を載せて SDP を POST する。

**SNOW の SDK・API キーは本リポジトリには含めない。** 契約・取得は SNOW 公式の開発者向け手順に従う。

## フェーズ A: スパイク（着手前チェックリスト）

1. SNOW 公式ドキュメントで **対象 OS**（iOS / Android）と **配布形態**（CocoaPods / SPM / Maven 等）を確認する。
2. **ライブ配信・WebRTC との推奨統合**があるか確認する（プレビュー用 API だけか、エンコード済みフレーム／テクスチャの取得可否）。
3. ライセンス・利用規約・**顔画像の取り扱い**（プライバシー）を確認する。
4. 最小ネイティブアプリ（または bare React Native）に SDK を組み、**プレビュー + 1 フィルター**まで到達できるか検証する。
5. 出力を **WebRTC の `MediaStream` / `VideoTrack`** に載せられるか、または **カスタム映像ソース** として `react-native-webrtc` に渡せるかを検証する。

**判定**: 5 が不可能に近い場合は、SNOW サポートに問い合わせるか、Canvas + `captureStream`（Web のみ）や別 RTC ベンダーを検討する。

## フェーズ B: Expo / EAS

- **Expo Go では不可。** `npx expo prebuild` 後の **開発ビルド**（EAS Build 等）が前提。
- 依存追加後は `pod install`（iOS）と Gradle 同期（Android）が必要。
- 本リポジトリの [`plugins/withLiveBroadcastPermissions.js`](../plugins/withLiveBroadcastPermissions.js) が **カメラ・マイクの権限文案**を `prebuild` 時に注入する。SNOW 用の追加キーが必要なら同プラグインを拡張する。

### 推奨ネイティブ構成（論理）

1. ネイティブ: SNOW のプレビュー／キャプチャから **加工済み映像**を取得。
2. ブリッジ: React Native から **`react-native-webrtc`** 等で `MediaStream` を構築しトラックを追加できるようにする（SNOW 公式の推奨パターンを優先）。
3. JS: 既存の **`connectWHIP(whipUrl, stream)`**（[`lib/live/whip.ts`](../lib/live/whip.ts)）を **Web と同じシグネチャ**で呼べるようにする。

## アプリ内の接続点

| 画面 | ファイル | 備考 |
|------|-----------|------|
| ライブ配信（ホスト） | [`app/broadcast.tsx`](../app/broadcast.tsx) | Web は `getUserMedia` + WHIP。ネイティブは `expo-camera` プレビューのみ。SNOW 統合後は `getNativeBroadcastMediaStream` を実装して差し替え。 |
| メンター WHIP | [`app/mentor-room/[id].tsx`](../app/mentor-room/[id].tsx) | Web のみ `connectWHIP` 使用。ネイティブから同じユーティリティを使う場合は上記ブリッジ完了後に分岐を外す。 |

## プライバシー・ストア審査

- **App Store / Google Play**: カメラ・マイク用途説明（Info.plist / AndroidManifest）はプラグインで最低限を設定済み。SNOW 利用時は **第三者 SDK のデータ取り扱い**をプライバシーラベル・ポリシーに追記する。
- **バージョン固定**: SNOW SDK のバージョンを `package.json` / Pod / Gradle でピンし、CI で再現可能にする。
- **クラッシュログ**: ネイティブクラッシュは Firebase Crashlytics 等の有無を運用で決める。

## SDK バージョン記録（手動）

契約後、ここに実際のバージョンを追記する。

| コンポーネント | バージョン | 更新日 |
|----------------|------------|--------|
| SNOW SDK (iOS) | _TBD_ | |
| SNOW SDK (Android) | _TBD_ | |
| react-native-webrtc | _TBD_ | |
