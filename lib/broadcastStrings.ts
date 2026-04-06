export type BroadcastCopy = {
  alertTitleLive: string;
  titleRequired: string;
  cameraPermissionPWA: string;
  cameraPermissionShort: string;
  goLiveFailed: string;
  endConfirmTitle: string;
  endConfirmMessage: string;
  endConfirmOk: string;
  endCancel: string;
  nonWebTitle: string;
  nonWebSub: string;
  nonWebBack: string;
  cameraErrorTitle: string;
  cameraErrorSub: string;
  cameraRetry: string;
  pwaGateTitle: string;
  pwaGateSub: string;
  pwaGateBtn: string;
  readyLabel: string;
  titlePlaceholder: string;
  deeparTitle: string;
  deeparSub: string;
  stopStream: string;
  goLive: string;
  allowCameraFirst: string;
};

const JA: BroadcastCopy = {
  alertTitleLive: "ライブ配信",
  titleRequired: "配信タイトルを入力してください。",
  cameraPermissionPWA:
    "カメラとマイクの許可が必要です。PWA の場合は設定アプリから RawStock（Safari）のカメラ・マイクをオンにしてください。",
  cameraPermissionShort: "カメラとマイクの許可が必要です。",
  goLiveFailed: "配信を開始できませんでした。ネットワークとマイク・カメラを確認してください。",
  endConfirmTitle: "配信を終了",
  endConfirmMessage: "ライブ配信を終了しますか？",
  endConfirmOk: "終了",
  endCancel: "キャンセル",
  nonWebTitle: "ブラウザまたは PWA で開いてください",
  nonWebSub:
    "ライブ配信は Web 版（ホーム画面に追加した RawStock や Chrome / Safari）のみ対応しています。",
  nonWebBack: "戻る",
  cameraErrorTitle: "カメラ・マイクが使えません",
  cameraErrorSub: "設定でカメラとマイクを許可するか、下のボタンでもう一度お試しください。",
  cameraRetry: "もう一度許可する",
  pwaGateTitle: "PWA / モバイルでは先に許可が必要です",
  pwaGateSub: "下のボタンをタップしてカメラとマイクをオンにしてください",
  pwaGateBtn: "カメラ・マイクを許可",
  readyLabel: "配信準備",
  titlePlaceholder: "配信タイトル（必須）",
  deeparTitle: "背景ぼかし（DeepAR）",
  deeparSub: "オフにすると従来どおり生カメラのみです",
  stopStream: "配信を終了",
  goLive: "配信開始",
  allowCameraFirst: "先にカメラを許可",
};

const EN: BroadcastCopy = {
  alertTitleLive: "Live broadcast",
  titleRequired: "Enter a stream title.",
  cameraPermissionPWA:
    "Camera and microphone access is required. On iOS PWA, enable Camera & Microphone for this app in Settings → Safari / RawStock.",
  cameraPermissionShort: "Camera and microphone permission is required.",
  goLiveFailed: "Could not start the stream. Check your network, camera, and microphone.",
  endConfirmTitle: "End stream",
  endConfirmMessage: "Stop the live broadcast?",
  endConfirmOk: "End",
  endCancel: "Cancel",
  nonWebTitle: "Open in browser or PWA",
  nonWebSub: "Live hosting works on the web app only (Safari, Chrome, or the RawStock icon added to your home screen).",
  nonWebBack: "Back",
  cameraErrorTitle: "Camera & mic unavailable",
  cameraErrorSub: "Allow access in system settings, or tap below to try again.",
  cameraRetry: "Try again",
  pwaGateTitle: "Allow camera & microphone first",
  pwaGateSub: "Tap the button below to enable your camera and microphone.",
  pwaGateBtn: "Allow camera & microphone",
  readyLabel: "Ready to go live",
  titlePlaceholder: "Stream title (required)",
  deeparTitle: "Background blur (DeepAR)",
  deeparSub: "Turn off to use the raw camera only.",
  stopStream: "End broadcast",
  goLive: "Go live",
  allowCameraFirst: "Allow camera first",
};

export function getBroadcastStrings(japanese: boolean): BroadcastCopy {
  return japanese ? JA : EN;
}
