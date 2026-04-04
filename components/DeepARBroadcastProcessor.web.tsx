import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { DeepAR } from "deepar";

export type DeepARBroadcastProcessorHandle = {
  dispose: () => void;
};

export type DeepARBroadcastProcessorProps = {
  rawStream: MediaStream;
  licenseKey: string;
  /** 1–10 per DeepAR API */
  blurStrength?: number;
  onReady: (mergedStream: MediaStream) => void;
  onError: (message: string) => void;
};

function deeparRootUrl(): string {
  if (typeof window === "undefined") return "/deepar/";
  return new URL("/deepar/", window.location.origin).href;
}

function mergeVideoWithAudio(videoStream: MediaStream, audioSource: MediaStream): MediaStream {
  const v = videoStream.getVideoTracks()[0];
  const a = audioSource.getAudioTracks()[0];
  const tracks: MediaStreamTrack[] = [];
  if (v) tracks.push(v);
  if (a) tracks.push(a);
  return new MediaStream(tracks);
}

export const DeepARBroadcastProcessor = forwardRef<
  DeepARBroadcastProcessorHandle,
  DeepARBroadcastProcessorProps
>(function DeepARBroadcastProcessor(
  { rawStream, licenseKey, blurStrength = 5, onReady, onError },
  ref,
) {
  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deepARRef = useRef<DeepAR | null>(null);
  const captureVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const disposedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const dispose = () => {
    disposedRef.current = true;
    try {
      captureVideoTrackRef.current?.stop();
    } catch {
      /* ignore */
    }
    captureVideoTrackRef.current = null;
    try {
      deepARRef.current?.shutdown();
    } catch {
      /* ignore */
    }
    deepARRef.current = null;
    const v = inputVideoRef.current;
    if (v) {
      v.srcObject = null;
    }
  };

  useImperativeHandle(ref, () => ({ dispose }), []);

  useEffect(() => {
    disposedRef.current = false;
    const inputVideo = inputVideoRef.current;
    const canvas = canvasRef.current;
    if (!inputVideo || !canvas || !rawStream || !licenseKey) return;

    let cancelled = false;

    const run = async () => {
      try {
        inputVideo.muted = true;
        inputVideo.playsInline = true;
        inputVideo.srcObject = rawStream;
        await inputVideo.play();

        const width = 1280;
        const height = 720;
        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const deepar = await import("deepar");
        const instance = await deepar.initialize({
          licenseKey,
          canvas,
          rootPath: deeparRootUrl(),
          additionalOptions: {
            cameraConfig: { disableDefaultCamera: true },
            hint: ["segmentationInit"],
          },
        });
        if (cancelled || disposedRef.current) {
          instance.shutdown();
          return;
        }
        deepARRef.current = instance;
        instance.setVideoElement(inputVideo, true);
        instance.setFps(30);
        await instance.backgroundBlur(true, blurStrength);

        const c = instance.getCanvas();
        let cap: MediaStream;
        try {
          cap = c.captureStream(30);
        } catch {
          cap = c.captureStream();
        }
        const vTrack = cap.getVideoTracks()[0] ?? null;
        if (!vTrack) {
          throw new Error("キャンバスから映像トラックを取得できませんでした。");
        }
        captureVideoTrackRef.current = vTrack;
        const merged = mergeVideoWithAudio(cap, rawStream);
        if (cancelled || disposedRef.current) {
          dispose();
          return;
        }
        onReadyRef.current(merged);
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "DeepAR の初期化に失敗しました。";
        dispose();
        if (!cancelled) onErrorRef.current(msg);
      }
    };

    void run();

    return () => {
      cancelled = true;
      dispose();
    };
  }, [rawStream, licenseKey, blurStrength]);

  return (
    <>
      <video
        ref={inputVideoRef}
        muted
        playsInline
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          clipPath: "inset(50%)",
        }}
      />
    </>
  );
});
