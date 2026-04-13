import React from "react";
import { Platform, Text, View } from "react-native";

/** Express serves this with logo URL injected from lib/brand (see server/index.ts). */
function lpStandaloneSrcForWeb(): string {
  if (typeof window === "undefined") {
    return "/lp-standalone.html";
  }
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
      return `${origin}/lp-standalone.html`;
    } catch {
      /* fall through */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5001/lp-standalone.html";
  }
  return `${window.location.origin}/lp-standalone.html`;
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
    <iframe
      src={lpStandaloneSrcForWeb()}
      title="RawStock LP"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
      }}
    />
  );
}
