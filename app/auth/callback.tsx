import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { consumeLoginRedirectPath } from "@/lib/login-return";
import { C } from "@/constants/colors";

/**
 * OAuth callback page for same-tab redirect flow.
 * Server redirects to /auth/callback?token=xxx.
 *
 * In popup mode (e.g., Google OAuth), postMessage token to opener and close popup.
 * In same-tab mode, call loginWithToken directly.
 */
export default function AuthCallbackScreen() {
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      router.replace("/auth/login" as any);
      return;
    }

    // Read token from URLSearchParams directly to avoid router timing issues.
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      router.replace("/auth/login?auth_error=me_failed" as any);
      return;
    }

    // Detect whether this page is running in a popup window.
    const isPopup =
      typeof window !== "undefined" &&
      window.opener != null &&
      !window.opener.closed;

    if (isPopup) {
      // Popup mode: notify opener and close.
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

    // Same-tab mode (or postMessage failure): direct login flow.
    let cancelled = false;
    (async () => {
      try {
        await loginWithToken(token);
        if (cancelled) return;
        router.replace(consumeLoginRedirectPath() as any);
      } catch (e) {
        console.error("[auth/callback] loginWithToken failed:", e);
        if (!cancelled) {
          setStatus("error");
          setTimeout(() => {
            router.replace("/auth/login?auth_error=me_failed" as any);
          }, 1500);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginWithToken]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      <ActivityIndicator color={C.accent} size="large" />
      <Text
        style={{
          color: status === "error" ? "#ef4444" : C.textMuted,
          fontSize: 13,
          fontFamily: "Courier Prime",
        }}
      >
        {status === "error" ? "Login failed. Please try again..." : "Signing in..."}
      </Text>
    </View>
  );
}
