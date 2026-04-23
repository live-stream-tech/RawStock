import React from "react";
import { Platform, Text, View } from "react-native";

import { RAWSTOCK_LP_PUBLIC_PATH, RAWSTOCK_LP_SITE_DEFAULT } from "@/lib/rawstockLpSite";

/**
 * 既定: 同一オリジンの {@link RAWSTOCK_LP_PUBLIC_PATH}（本番は rawstock.live 上で表示）。
 * 上書き: `EXPO_PUBLIC_RAWSTOCK_LP_URL` または `EXPO_PUBLIC_LP_STANDALONE_URL`（フル URL）。
 * レガシー: `EXPO_PUBLIC_USE_LEGACY_LP_HTML=1` で従来の `/lp-standalone.html` へ（主にローカル）。
 */
function lpStandaloneSrcForWeb(): string {
  if (typeof window === "undefined") {
    return `${RAWSTOCK_LP_SITE_DEFAULT.replace(/\/+$/, "")}${RAWSTOCK_LP_PUBLIC_PATH}`;
  }
  const explicit =
    process.env.EXPO_PUBLIC_RAWSTOCK_LP_URL?.trim() ||
    process.env.EXPO_PUBLIC_LP_STANDALONE_URL?.trim();
  if (explicit) {
    return explicit;
  }
  if (process.env.EXPO_PUBLIC_USE_LEGACY_LP_HTML === "1") {
    const env =
      process.env.EXPO_PUBLIC_DOMAIN?.trim() ||
      process.env.EXPO_PUBLIC_API_URL?.trim();
    if (env) {
      try {
        const withScheme = /^https?:\/\//i.test(env)
          ? env
          : env.includes("localhost") || env.startsWith("127.")
            ? `http://${env}`
            : `https://${env}`;
        const origin = new URL(withScheme).origin;
        return `${origin}${RAWSTOCK_LP_PUBLIC_PATH}`;
      } catch {
        /* fall through */
      }
    }
    if (process.env.NODE_ENV !== "production") {
      return `http://localhost:5001${RAWSTOCK_LP_PUBLIC_PATH}`;
    }
    return `${window.location.origin}${RAWSTOCK_LP_PUBLIC_PATH}`;
  }

  return `${window.location.origin}${RAWSTOCK_LP_PUBLIC_PATH}`;
}

export function RawstockLpContent() {
  if (Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", backgroundColor: "#07090f" }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Please open this landing page in a web browser.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
      <iframe
        src={lpStandaloneSrcForWeb()}
        title="RawStock LP"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </View>
  );
}
