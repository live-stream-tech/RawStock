# Native Live and Filter Policy (WHIP / Cloudflare Stream)

RawStock live publishing uses Cloudflare Stream **WHIP** (WebRTC ingest).
On web, [`lib/live/whip.ts`](../lib/live/whip.ts) posts SDP from `RTCPeerConnection` using camera `MediaStream`.

## Policy Update (SNOW)

Beauty AR SDKs (SNOW in earlier docs) are not the default path.
Priorities are based on implementation cost, `MediaStream` compatibility, and licensing.

| Priority | Approach | Notes |
|----------|----------|-------|
| A | **`react-native-webrtc` + camera raw `MediaStream` -> existing `connectWHIP`** | Main path to enable mobile broadcasting. Requires prebuild/dev client in Expo. |
| B | **Lightweight processing** | Consider [`react-native-vision-camera`](https://react-native-vision-camera.com/) frame processors/community plugins. |
| C | **RTMPS ingest** | Uses `streams.rtmpsUrl` / `streams.rtmpsStreamKey`; typically higher latency than WebRTC. |
| Web | **Raw preview** in [`app/broadcast.tsx`](../app/broadcast.tsx) | Pre-live CSS filter UI was removed. Evaluate processing separately if needed. |

Legacy reference: [`SNOW_SDK_INTEGRATION.md`](./SNOW_SDK_INTEGRATION.md).

## Remote Session / Sync

Strict low-latency synchronized multi-site performance is currently out of scope.
Contributors interested in this research area are welcome.

## Expo / EAS

- Expo Go is not supported for this workflow.
- Use `npx expo prebuild` + development build (e.g. EAS Build).
- Current production target is Web/PWA.

## App Integration Points

| Screen | File | Notes |
|--------|------|-------|
| Live broadcast (host) | [`app/broadcast.tsx`](../app/broadcast.tsx) | Web/PWA only. `getUserMedia` + WHIP via `acquireBroadcastMediaStream`. |
| Mentor WHIP | [`app/mentor-room/[id].tsx`](../app/mentor-room/[id].tsx) | `connectWHIP` on web; native path to share utility later. |

## Privacy / Store Review

If third-party camera/video SDKs are added, update privacy labels/policy accordingly.
Pin versions in Pod/Gradle/`package.json`.

## Component Version Notes

| Component | Version | Updated |
|-----------|---------|---------|
| react-native-webrtc | _TBD_ | |
| react-native-vision-camera | _TBD_ | |
