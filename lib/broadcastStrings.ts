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
  stopStream: string;
  goLive: string;
  allowCameraFirst: string;
  /** Broadcaster panel while live */
  visibilityPublic: string;
  visibilityFollowers: string;
  visibilityCommunity: string;
  visibilityPaid: string;
  liveStatusPrefix: string;
  liveChatTitle: string;
  liveChatEmpty: string;
};

const COPY: BroadcastCopy = {
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
  stopStream: "End broadcast",
  goLive: "Go live",
  allowCameraFirst: "Allow camera first",
  visibilityPublic: "Public",
  visibilityFollowers: "Followers only",
  visibilityCommunity: "Community only",
  visibilityPaid: "Paid stream",
  liveStatusPrefix: "Live",
  liveChatTitle: "Live chat",
  liveChatEmpty: "No comments yet",
};

/** Broadcast UI copy (English only). */
export function getBroadcastStrings(_japanese?: boolean): BroadcastCopy {
  return COPY;
}
