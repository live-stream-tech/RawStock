import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getLoginReturn } from "@/lib/login-return";
import { C } from "@/constants/colors";

/**
 * Fallback for environments where popup loses window.opener.
 * Handles /auth/popup-fallback?token=...
 *
 * In popup mode, notify opener and close popup.
 * In main-window mode, login directly with token.
 */
export default function PopupFallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "web" || !token) {
      router.replace("/auth/login" as any);
      return;
    }

    // Detect whether this page is in a popup window.
    const isPopup =
      typeof window !== "undefined" &&
      window.opener != null &&
      !window.opener.closed;

    if (isPopup) {
      // Popup mode: update opener via postMessage.
      try {
        window.opener.postMessage(
          { type: "auth_success", token },
          window.location.origin
        );
        setTimeout(() => window.close(), 300);
        return;
      } catch {
        // Fall through to direct login if postMessage fails.
      }
    }

    // Main-window mode (or postMessage failure): direct login flow.
    let cancelled = false;
    (async () => {
      try {
        await loginWithToken(token);
        if (cancelled) return;
        const saved = getLoginReturn();
        let returnTo = saved ?? "/(tabs)/profile";
        if (returnTo.startsWith("/auth/")) returnTo = "/(tabs)/profile";
        router.replace(returnTo as any);
      } catch {
        if (!cancelled) router.replace("/auth/login?auth_error=me_failed" as any);
      }
    })();
    return () => { cancelled = true; };
  }, [token, loginWithToken]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 }}>
      <ActivityIndicator color={C.accent} size="large" />
      <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: "Courier Prime" }}>Signing in...</Text>
    </View>
  );
}
