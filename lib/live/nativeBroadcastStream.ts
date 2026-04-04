import { Platform } from "react-native";

/**
 * After react-native-webrtc (and optional camera pipeline): return a MediaStream for WHIP here.
 * Until then, native broadcast shows camera preview only; WHIP is started from web.
 */
export class NativeBroadcastStreamError extends Error {
  readonly code = "NATIVE_BROADCAST_REQUIRES_SNOW_BRIDGE" as const;
  constructor() {
    super(
      "モバイルからのライブ配信（WHIP）にはネイティブ向け WebRTC（MediaStream）が必要です。詳細は docs/LIVE_NATIVE_AND_FILTERS.md。当面はブラウザから「Go Live」してください。",
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
    const primary: MediaStreamConstraints = {
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    };
    try {
      return await nav.mediaDevices.getUserMedia(primary);
    } catch {
      try {
        return await nav.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      } catch {
        /* マイクのみ拒否の端末向け（映像のみ配信） */
        return await nav.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      }
    }
  }
  throw new NativeBroadcastStreamError();
}
