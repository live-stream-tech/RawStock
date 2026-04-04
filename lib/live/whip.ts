/**
 * WHIP (WebRTC-HTTP ingestion) helper shared by live broadcast and mentor-room (web).
 * Native: wire SNOW / react-native-webrtc to produce a MediaStream, then call the same function.
 */

function getRTCPeerConnection(): typeof RTCPeerConnection {
  const Ctor = (globalThis as unknown as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection;
  if (!Ctor) {
    throw new Error(
      "RTCPeerConnection is not available. On native, add react-native-webrtc and polyfill globals, or use web. See docs/LIVE_NATIVE_AND_FILTERS.md",
    );
  }
  return Ctor;
}

export function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    setTimeout(done, timeoutMs);
  });
}

export async function connectWHIP(whipUrl: string, stream: MediaStream): Promise<RTCPeerConnection> {
  const RTCPeerConnectionImpl = getRTCPeerConnection();
  const pc = new RTCPeerConnectionImpl({
    iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
    bundlePolicy: "max-bundle",
  });
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("Missing local SDP after offer");
  const res = await fetch(whipUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: sdp,
  });
  if (!res.ok) throw new Error(`WHIP error: ${res.status}`);
  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  return pc;
}
