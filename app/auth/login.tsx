import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/constants/colors";
import { AppLogo } from "@/components/AppLogo";
import { getApiUrl } from "@/lib/query-client";
import { getLoginReturn, saveLoginReturn } from "@/lib/login-return";
import { useAuth } from "@/lib/auth";
import { scrollShowsHorizontal, scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle } from "@/constants/layout";

const ERROR_LABELS: Record<string, string> = {
  invalid_state: "Authentication expired. Please try again.",
  token_failed: "Failed to retrieve token.",
  profile_failed: "Failed to retrieve profile.",
  server_error: "A server error occurred. Please try again later.",
  me_failed: "Failed to verify login. Please try again.",
};
const getErrorLabel = (key: string) => {
  if (ERROR_LABELS[key]) return ERROR_LABELS[key];
  if (key.startsWith("server_error:")) return `Server error: ${key.slice(13, 93)}`;
  return key.length > 50 ? "An error occurred." : `Error: ${key}`;
};

export default function LoginScreen() {
  const { auth_error } = useLocalSearchParams<{ auth_error?: string }>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (auth_error && Platform.OS === "web" && typeof window !== "undefined") {
      const msg = getErrorLabel(auth_error);
      setErrorMsg(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [auth_error]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 12 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  function openAuthRedirect(path: string) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      if (!currentPath.startsWith("/auth/")) {
        saveLoginReturn(currentPath);
      }
      const apiBase = getApiUrl();
      const url = new URL(path, apiBase).toString();
      window.location.href = url;
    } else {
      router.replace("/(tabs)");
    }
  }

  function handleGoogleLogin() {
    openAuthRedirect("/api/auth/google");
  }

  async function handleDemoLogin() {
    if (demoLoading) return;
    setDemoLoading(true);
    setErrorMsg(null);
    try {
      console.info("[auth/login] Try Demo pressed");
      const apiBase = getApiUrl();
      const url = new URL("/api/auth/demo", apiBase).toString();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let res: Response;
      let rawText = "";
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        rawText = await res.text();
      } finally {
        clearTimeout(timeoutId);
      }

      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { error: rawText || "Invalid response" };
      }

      console.info("[auth/login] Try Demo response", {
        status: res.status,
        hasToken: !!data?.token,
        error: data?.error,
        code: data?.code,
      });

      if (!res.ok || !data?.token) {
        const code = data?.code ? String(data.code) : undefined;
        const baseMsg = data?.error ?? "Demo login failed. Please try again.";
        setErrorMsg(code ? `${baseMsg} (${code})` : baseMsg);
        return;
      }

      await loginWithToken(data.token);

      // Auth/callback と同じ方針で、不要な returnTo は除外する
      const saved = getLoginReturn();
      const fallback = "/(tabs)/profile";
      let returnTo = saved ?? fallback;

      const isInvalidReturn =
        returnTo === "/(tabs)" ||
        returnTo.startsWith("/auth/") ||
        returnTo.startsWith("/jukebox") ||
        returnTo.startsWith("/lp") ||
        returnTo.startsWith("/rawstock-lp") ||
        returnTo.startsWith("/terms") ||
        returnTo.startsWith("/privacy") ||
        returnTo.startsWith("/tokusho");

      if (isInvalidReturn) returnTo = fallback;

      console.info("[auth/login] Try Demo redirect to", returnTo);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        // Web/PWA では router.replace が環境依存で反映されないことがあるため、
        // 成功時はブラウザ遷移を優先して確実に画面更新する。
        window.location.replace(returnTo);
      } else {
        router.replace(returnTo as any);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setErrorMsg("Request timed out. Please try again.");
        return;
      }
      console.error("[auth/login] Try Demo failed:", e);
      setErrorMsg("Network error. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <ScrollView
      style={webScrollStyle({ flex: 1 })}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topInset, paddingBottom: bottomInset + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={scrollShowsVertical}
    >
      <View style={styles.logoWrap}>
        <AppLogo height={36} />
        <Text style={styles.tagline}>Amplifying the Raw Heat</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}
        <Text style={styles.cardSub}>
          Sign in with Google to comment, purchase, upload, and manage your profile.
        </Text>

        <Pressable style={styles.googleLoginBtn} onPress={handleGoogleLogin}>
          <Image
            source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }}
            style={styles.googleIcon}
            contentFit="contain"
          />
          <Text style={styles.googleLoginText}>Sign in with Google</Text>
        </Pressable>

        <View style={styles.consentWrap}>
          <Text style={styles.consentText}>
            By signing up, you agree to our{" "}
            <Text style={styles.consentLink} onPress={() => router.push("/terms")}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={styles.consentLink} onPress={() => router.push("/privacy")}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <Pressable
          style={[styles.demoBtn, demoLoading && styles.demoBtnDisabled]}
          onPress={handleDemoLogin}
          disabled={demoLoading}
        >
          {demoLoading ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Text style={styles.demoBtnText}>Try Demo</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.guestLink} onPress={() => router.replace("/community")}>
        <Text style={styles.guestLinkText}>Continue without signing in</Text>
      </Pressable>

      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push("/terms")}>
          <Text style={styles.legalLinkText}>Terms</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>|</Text>
        <Pressable onPress={() => router.push("/privacy")}>
          <Text style={styles.legalLinkText}>Privacy Policy</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>|</Text>
        <Pressable onPress={() => router.push("/tokusho")}>
          <Text style={styles.legalLinkText}>Legal Notice</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center", backgroundColor: C.bg },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  tagline: { color: C.textMuted, fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: "#0a0a0a",
    borderRadius: 4,
    padding: 28,
    borderWidth: 1,
    borderColor: C.accent,
    marginBottom: 20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  cardTitle: { color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 12, fontFamily: "Barlow Condensed" },
  errorBanner: { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 4, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" },
  errorText: { color: "#ef4444", fontSize: 13, fontFamily: "Courier Prime" },
  cardSub: { color: C.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 20, fontFamily: "Courier Prime" },

  googleLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 4,
    paddingVertical: 16,
  },
  googleIcon: { width: 24, height: 24 },
  googleLoginText: { color: "#050505", fontSize: 16, fontWeight: "800", fontFamily: "Barlow Condensed" },
  consentWrap: { marginTop: 10, alignItems: "center" },
  consentText: { color: C.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16, fontFamily: "Courier Prime" },
  consentLink: { color: C.accent, textDecorationLine: "none" },

  demoBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: "transparent",
  },
  demoBtnDisabled: { opacity: 0.5 },
  demoBtnText: { color: C.accent, fontSize: 15, fontWeight: "700", fontFamily: "Barlow Condensed" },

  guestLink: { alignItems: "center", paddingVertical: 12 },
  guestLinkText: { color: C.textMuted, fontSize: 13, fontFamily: "Courier Prime" },

  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  legalLinkText: { color: C.accent, fontSize: 12, fontFamily: "Courier Prime" },
  legalSeparator: { color: C.textMuted, fontSize: 12 },
});
