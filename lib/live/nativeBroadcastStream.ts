import { Platform } from "react-native";

/**
 * After SNOW SDK + react-native-webrtc bridge: return a MediaStream for WHIP here.
 * Until then, native broadcast shows camera preview only; WHIP is started from web.
 */
export class NativeBroadcastStreamError extends Error {
  readonly code = "NATIVE_BROADCAST_REQUIRES_SNOW_BRIDGE" as const;
  constructor() {
    super(
      "モバイルからのライブ配信（WHIP）には SNOW SDK と WebRTC ブリッジが必要です。詳細は docs/SNOW_SDK_INTEGRATION.md。当面はブラウザから「Go Live」してください。",
    );
    this.name = "NativeBroadcastStreamError";
  }
}

/** @returns MediaStream on web; never resolves on native until implemented */
export async function acquireBroadcastMediaStream(): Promise<MediaStream> {
  if (Platform.OS === "web") {
    const nav = globalThis.navigator as Navigator & { mediaDevices?: MediaDevices };
    if (!nav?.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia is not available");
    }
    return nav.mediaDevices.getUserMedia({ video: true, audio: true });
  }
  throw new NativeBroadcastStreamError();
}
