import React from "react";
import { Platform, Text, View } from "react-native";

/**
 * Production LP content lives in `public/lp-standalone.html`.
 * The server injects asset URLs (see `injectLpMarketingHtml` in server/index.ts and server/vercel-app.ts).
 * `vite-app/app/rawstock-lp/LandingPage.tsx` is not wired into this iframe unless you add a build step.
 */
function lpStandaloneSrcForWeb(): string {
  if (typeof window === "undefined") {
    return "/lp-standalone.html";
  }
  const externalLp = process.env.EXPO_PUBLIC_LP_STANDALONE_URL?.trim();
  if (externalLp) {
    return externalLp;
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
