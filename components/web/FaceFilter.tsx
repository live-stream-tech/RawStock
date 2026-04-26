import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const JEELIZ_SCRIPT = "https://appstatic.jeeliz.com/faceFilter/jeelizFaceFilter.js";
const HELPER_SCRIPT = "jeeliz/JeelizCanvas2DHelper.js";
export const RAWSTOCK_JEELIZ_CANVAS_ID = "rawstock-jeeliz-canvas";

type JeelizGlobal = {
  init: (opts: Record<string, unknown>) => void;
  resize: () => void;
  destroy: () => Promise<void>;
};

type Canvas2DHelper = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  update_canvasTexture: () => void;
  draw: () => void;
  getCoordinates: (detectState: DetectState) => { x: number; y: number; w: number; h: number };
  resize: () => void;
};

type DetectState = {
  detected: number;
  x: number;
  y: number;
  s: number;
  rx?: number;
  ry?: number;
  rz?: number;
  expressions?: number[];
};

declare global {
  interface Window {
    JEELIZFACEFILTER?: JeelizGlobal;
    JeelizCanvas2DHelper?: (spec: unknown) => Canvas2DHelper;
  }
}

function loadScriptOnce(src: string, dataAttr: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = document.querySelector(`script[data-rawstock="${dataAttr}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.rawstock = dataAttr;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

function errCodeToMessage(code: unknown): string {
  if (code === false || code === null || code === undefined) return "";
  const c = String(code);
  switch (c) {
    case "GL_INCOMPATIBLE":
      return "WebGL is not available or does not meet requirements for face tracking.";
    case "WEBCAM_UNAVAILABLE":
      return "Camera is unavailable or permission was denied.";
    case "NO_CANVASID":
    case "INVALID_CANVASID":
      return "Face filter display could not be initialized.";
    case "INVALID_CANVASDIMENSIONS":
      return "Invalid canvas size for face filter.";
    case "ALREADY_INITIALIZED":
      return "Face filter is already running.";
    case "GLCONTEXT_LOST":
      return "Graphics context was lost. Try reloading the page.";
    default:
      return `Face filter failed to start (${c}).`;
  }
}

export type FaceFilterWebProps = {
  /** Raw camera (+ mic) stream from getUserMedia. When null, Jeeliz is torn down. */
  sourceStream: MediaStream | null;
  onOutputStream: (stream: MediaStream | null) => void;
  onError: (message: string) => void;
};

export type FaceFilterWebHandle = {
  /** Await before stopping underlying MediaStream tracks (Jeeliz releases the video element). */
  destroy: () => Promise<void>;
};

function waitVideoReady(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: number | undefined;
    const cleanup = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      video.removeEventListener("loadeddata", tryDone);
      video.removeEventListener("canplay", tryDone);
      video.removeEventListener("timeupdate", tryDone);
    };
    const tryDone = () => {
      if (video.readyState >= 2) {
        cleanup();
        resolve();
      }
    };
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera video did not become ready in time."));
    }, timeoutMs);
    video.addEventListener("loadeddata", tryDone);
    video.addEventListener("canplay", tryDone);
    video.addEventListener("timeupdate", tryDone);
    void video.play().catch(() => undefined);
    tryDone();
  });
}

/**
 * Web-only Jeeliz FaceFilter host: loads CDN + local helper, runs tracking on `sourceStream`,
 * draws a debug circle at the approximate nose, and exposes `canvas.captureStream` + audio via `onOutputStream`.
 */
export const FaceFilterWeb = forwardRef<FaceFilterWebHandle, FaceFilterWebProps>(function FaceFilterWeb(
  { sourceStream, onOutputStream, onError },
  ref,
) {
  const hostRef = useRef<View | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const helperRef = useRef<Canvas2DHelper | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  const teardown = useCallback(async () => {
    resizeObsRef.current?.disconnect();
    resizeObsRef.current = null;
    outputStreamRef.current?.getTracks().forEach((t) => t.stop());
    outputStreamRef.current = null;
    helperRef.current = null;
    const v = videoElRef.current;
    if (v) {
      try {
        v.pause();
        v.srcObject = null;
      } catch {
        /* ignore */
      }
      v.remove();
      videoElRef.current = null;
    }
    const JF = typeof window !== "undefined" ? window.JEELIZFACEFILTER : undefined;
    if (JF?.destroy) {
      try {
        await JF.destroy();
      } catch {
        /* ignore */
      }
    }
    onOutputStream(null);
  }, [onOutputStream]);

  useImperativeHandle(ref, () => ({ destroy: teardown }), [teardown]);

  const applyCanvasSizeFromHost = useCallback(() => {
    if (typeof window === "undefined") return;
    const glCanvas = document.getElementById(RAWSTOCK_JEELIZ_CANVAS_ID) as HTMLCanvasElement | null;
    if (!glCanvas) return;
    const node = hostRef.current as unknown as HTMLDivElement | null;
    const rect = node?.getBoundingClientRect?.();
    const w = Math.max(320, Math.floor(rect?.width || window.innerWidth));
    const h = Math.max(240, Math.floor(rect?.height || window.innerHeight * 0.55));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    glCanvas.width = Math.floor(w * dpr);
    glCanvas.height = Math.floor(h * dpr);
    glCanvas.style.width = `${w}px`;
    glCanvas.style.height = `${h}px`;
    window.JEELIZFACEFILTER?.resize?.();
    helperRef.current?.resize?.();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    if (!sourceStream) {
      void teardown();
      setStatusText(null);
      return;
    }

    let cancelled = false;
    const disposers: (() => void)[] = [];

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack) {
      onError("No video track available from the camera.");
      return;
    }

    void (async () => {
      setStatusText("Loading face filter...");
      try {
        await loadScriptOnce(JEELIZ_SCRIPT, "jeeliz-core");
        if (!window.JEELIZFACEFILTER) throw new Error("Jeeliz script did not expose JEELIZFACEFILTER.");
        const helperUrl = new URL(HELPER_SCRIPT, window.location.href).href;
        await loadScriptOnce(helperUrl, "jeeliz-canvas2d-helper");
        if (!window.JeelizCanvas2DHelper) throw new Error("JeelizCanvas2DHelper failed to load.");
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load face filter scripts.";
          setStatusText(null);
          onError(msg);
        }
        return;
      }

      if (cancelled) return;

      await teardown();

      const hiddenVideo = document.createElement("video");
      hiddenVideo.muted = true;
      hiddenVideo.setAttribute("playsinline", "true");
      hiddenVideo.playsInline = true;
      hiddenVideo.autoplay = true;
      hiddenVideo.srcObject = sourceStream;
      hiddenVideo.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(hiddenVideo);
      videoElRef.current = hiddenVideo;

      try {
        await waitVideoReady(hiddenVideo, 12000);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Camera preview failed.";
          setStatusText(null);
          onError(msg);
        }
        hiddenVideo.remove();
        videoElRef.current = null;
        return;
      }

      if (cancelled) return;

      const neuralDir = new URL("jeeliz/neuralNets/", window.location.href).href;
      const neuralJson = new URL("jeeliz/neuralNets/NN_DEFAULT.json", window.location.href).href;
      const JF = window.JEELIZFACEFILTER!;

      try {
        await new Promise<void>((resolve, reject) => {
          const initTimeout = window.setTimeout(() => {
            reject(new Error("Face filter initialization timed out (NNC/WebGL/camera readiness)."));
          }, 15000);
          const done = (fn: () => void) => {
            window.clearTimeout(initTimeout);
            fn();
          };
          JF.init({
            canvasId: RAWSTOCK_JEELIZ_CANVAS_ID,
            NNCPath: neuralDir,
            NNC: neuralJson,
            videoSettings: {
              videoElement: hiddenVideo,
              flipX: true,
            },
            callbackReady: (errCode: unknown, spec: unknown) => {
              if (errCode) {
                const msg = errCodeToMessage(errCode);
                if (msg) onError(msg);
                else onError("Face filter failed to start.");
                done(() => reject(new Error(String(errCode))));
                return;
              }
              try {
                helperRef.current = window.JeelizCanvas2DHelper!(spec);
              } catch (e) {
                done(() => reject(e instanceof Error ? e : new Error("Canvas2D helper init failed")));
                return;
              }
              const glCanvas = document.getElementById(RAWSTOCK_JEELIZ_CANVAS_ID) as HTMLCanvasElement | null;
              if (!glCanvas) {
                done(() => reject(new Error("Jeeliz canvas missing from DOM.")));
                return;
              }
              requestAnimationFrame(() => {
                applyCanvasSizeFromHost();
              });
              const cap = glCanvas.captureStream(30);
              sourceStream.getAudioTracks().forEach((t) => cap.addTrack(t));
              outputStreamRef.current = cap;
              onOutputStream(cap);
              setStatusText(null);
              done(() => resolve());
            },
            callbackTrack: (detectState: DetectState) => {
              const CVD = helperRef.current;
              if (!CVD) return;
              CVD.ctx.clearRect(0, 0, CVD.canvas.width, CVD.canvas.height);
              if (detectState.detected > 0.5) {
                const face = CVD.getCoordinates(detectState);
                const nx = face.x + face.w / 2;
                const ny = face.y + face.h * 0.35;
                const r = Math.max(6, face.w * 0.07);
                CVD.ctx.beginPath();
                CVD.ctx.arc(nx, ny, r, 0, Math.PI * 2);
                CVD.ctx.fillStyle = "rgba(255,0,0,0.85)";
                CVD.ctx.fill();
                CVD.update_canvasTexture();
              } else {
                CVD.update_canvasTexture();
              }
              CVD.draw();
            },
          });
        });
      } catch {
        if (!cancelled) setStatusText(null);
        try {
          await window.JEELIZFACEFILTER?.destroy?.();
        } catch {
          /* ignore */
        }
        if (hiddenVideo.parentNode) hiddenVideo.remove();
        videoElRef.current = null;
        return;
      }

      if (cancelled) return;

      const canvasEl = document.getElementById(RAWSTOCK_JEELIZ_CANVAS_ID) as HTMLCanvasElement | null;
      if (canvasEl && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          applyCanvasSizeFromHost();
        });
        const node = hostRef.current as unknown as Element | null;
        if (node) ro.observe(node);
        resizeObsRef.current = ro;
        disposers.push(() => ro.disconnect());
      }

      const onWinResize = () => {
        applyCanvasSizeFromHost();
      };
      window.addEventListener("resize", onWinResize);
      disposers.push(() => window.removeEventListener("resize", onWinResize));
    })();

    return () => {
      cancelled = true;
      disposers.forEach((d) => d());
      void teardown();
    };
  }, [sourceStream, onOutputStream, onError, teardown, applyCanvasSizeFromHost]);

  if (Platform.OS !== "web") return null;

  return (
    <View ref={hostRef} style={styles.host} collapsable={false}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <canvas
        id={RAWSTOCK_JEELIZ_CANVAS_ID}
        width={1280}
        height={720}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover" as const,
          transform: "scaleX(-1)",
          display: "block",
          backgroundColor: "#000",
        }}
        {...({} as any)}
      />
      {statusText ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}
    </View>
  );
});

FaceFilterWeb.displayName = "FaceFilterWeb";

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    textAlign: "center",
  },
});
