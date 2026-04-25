/**
 * Browser/PWA helper: acquire a MediaStream for live preview / WHIP ingestion.
 */
export async function acquireBroadcastMediaStream(): Promise<MediaStream> {
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
      return await nav.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    }
  }
}
