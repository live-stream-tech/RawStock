import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { C } from "@/constants/colors";
import { resolvePublicMediaUri } from "@/lib/resolve-public-media-uri";
import {
  attachHtmlVideoPlaybackMonitor,
  type VideoPlaybackContext,
} from "@/lib/videoPlaybackTelemetry";

type Props = {
  videoUrl: string;
  videoId?: number;
};

/**
 * In-page HTML5 player for /video/[id] on web (avoids GlobalMyListPlayer off-screen positioning bugs).
 */
export function VideoDetailPlayer({ videoUrl, videoId }: Props) {
  const hostRef = useRef<View | null>(null);
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLDivElement | null;
    if (!host) return;

    setFatalMessage(null);
    const rawUrl = videoUrl;
    const src = resolvePublicMediaUri(rawUrl);
    const ctx: VideoPlaybackContext = {
      surface: "video_detail",
      videoId: videoId ?? null,
      rawUrl,
      resolvedUrl: src,
    };

    const v = document.createElement("video");
    v.controls = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "true");
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    v.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;background:#000;";
    v.src = src;

    host.appendChild(v);
    const detachMonitor = attachHtmlVideoPlaybackMonitor(v, ctx, {
      alertUser: true,
      onFatal: () => {
        setFatalMessage("This video could not be played. The issue was reported automatically.");
      },
    });

    return () => {
      detachMonitor();
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
        v.remove();
      } catch {
        /* ignore */
      }
    };
  }, [videoUrl, videoId]);

  return (
    <View style={styles.wrap} collapsable={false}>
      <View ref={hostRef} style={styles.host} />
      {fatalMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fatalMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    position: "relative",
  },
  host: {
    width: "100%",
    height: "100%",
  },
  errorBanner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errorText: {
    color: C.text,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
