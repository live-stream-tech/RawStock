import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { C } from "@/constants/colors";
import { fontBodyForUi, fontDisplayForUi } from "@/constants/fonts";
import { AppLogo } from "@/components/AppLogo";
import { getApiUrl } from "@/lib/query-client";
import { saveLoginReturn } from "@/lib/login-return";
import { scrollShowsVertical } from "@/lib/web-scroll-indicators";
import { webScrollStyle } from "@/constants/layout";

const ERROR_LABELS = {
  en: {
    invalid_state: "Authentication expired. Please try again.",
    token_failed: "Failed to retrieve token.",
    profile_failed: "Failed to retrieve profile.",
    server_error: "A server error occurred. Please try again later.",
    me_failed: "Failed to verify login. Please try again.",
  },
  ja: {
    invalid_state: "認証の有効期限が切れました。もう一度お試しください。",
    token_failed: "トークンの取得に失敗しました。",
    profile_failed: "プロフィールの取得に失敗しました。",
    server_error: "サーバーエラーが発生しました。しばらくしてからお試しください。",
    me_failed: "ログイン確認に失敗しました。もう一度お試しください。",
  },
} as const;

function detectJapaneseUi(): boolean {
  const locale =
    Platform.OS === "web" && typeof navigator !== "undefined"
      ? navigator.language ?? "en"
      : typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().locale ?? "en"
        : "en";
  return locale.toLowerCase().startsWith("ja");
}

const getErrorLabel = (key: string, isJaUi: boolean) => {
  const labels = isJaUi ? ERROR_LABELS.ja : ERROR_LABELS.en;
  if (key in labels) return labels[key as keyof typeof labels];
  if (key.startsWith("server_error:")) {
    return isJaUi ? `サーバーエラー: ${key.slice(13, 93)}` : `Server error: ${key.slice(13, 93)}`;
  }
  if (key.length > 50) return isJaUi ? "エラーが発生しました。" : "An error occurred.";
  return isJaUi ? `エラー: ${key}` : `Error: ${key}`;
};

export default function LoginScreen() {
  const { auth_error } = useLocalSearchParams<{ auth_error?: string }>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreePolicies, setAgreePolicies] = useState(false);
  const isJaUi = detectJapaneseUi();
  const t = isJaUi
    ? {
        title: "サインイン",
        subtitle: "Googleでサインインすると、コメント、購入、投稿、プロフィール管理ができます。",
        policyCheckbox: "利用規約とプライバシーポリシーを読み、同意しました。",
        googleButton: "Googleでサインイン",
        tagline: "Rawな熱量をそのまま届ける",
        consentPrefix: "登録することで、",
        consentJoiner: "と",
        consentSuffix: "に同意したものとみなされます。",
        terms: "利用規約",
        privacy: "プライバシーポリシー",
        continueAsGuest: "サインインせずに続ける",
        legalNotice: "特定商取引法に基づく表記",
      }
    : {
        title: "Sign In",
        subtitle: "Sign in with Google to comment, purchase, upload, and manage your profile.",
        policyCheckbox: "I have read and agree to the Terms of Service and Privacy Policy.",
        googleButton: "Sign in with Google",
        tagline: "Amplifying the Raw Heat",
        consentPrefix: "By signing up, you agree to our",
        consentJoiner: "and",
        consentSuffix: ".",
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        continueAsGuest: "Continue without signing in",
        legalNotice: "Legal Notice",
      };
  useEffect(() => {
    if (auth_error && Platform.OS === "web" && typeof window !== "undefined") {
      const msg = getErrorLabel(auth_error, isJaUi);
      setErrorMsg(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [auth_error, isJaUi]);
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
      router.replace("/");
    }
  }

  function handleGoogleLogin() {
    if (Platform.OS === "web" && !agreePolicies) {
      return;
    }
    if (Platform.OS === "web" && typeof window !== "undefined" && agreePolicies) {
      window.sessionStorage.setItem("rawstock_policy_ack", "1");
    }
    openAuthRedirect("/api/auth/google");
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
        <Text style={[styles.tagline, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.tagline}</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontFamily: fontDisplayForUi(isJaUi) }]}>{t.title}</Text>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={[styles.errorText, { fontFamily: fontBodyForUi(isJaUi) }]}>{errorMsg}</Text>
          </View>
        ) : null}
        <Text style={[styles.cardSub, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.subtitle}</Text>

        {Platform.OS === "web" ? (
          <Pressable
            style={styles.policyCheckRow}
            onPress={() => setAgreePolicies((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreePolicies }}
          >
            <View style={[styles.policyCheckBox, agreePolicies && styles.policyCheckBoxOn]}>
              {agreePolicies ? <Text style={styles.policyCheckMark}>✓</Text> : null}
            </View>
            <Text style={[styles.policyCheckLabel, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.policyCheckbox}</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.googleLoginBtn, Platform.OS === "web" && !agreePolicies && styles.googleLoginBtnDisabled]}
          onPress={handleGoogleLogin}
          disabled={Platform.OS === "web" && !agreePolicies}
        >
          <Image
            source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }}
            style={styles.googleIcon}
            contentFit="contain"
          />
          <Text style={[styles.googleLoginText, { fontFamily: fontDisplayForUi(isJaUi) }]}>{t.googleButton}</Text>
        </Pressable>

        <View style={styles.consentWrap}>
          <Text style={[styles.consentText, { fontFamily: fontBodyForUi(isJaUi) }]}>
            {t.consentPrefix}{" "}
            <Text style={styles.consentLink} onPress={() => router.push("/terms")}>
              {t.terms}
            </Text>{" "}
            {t.consentJoiner}{" "}
            <Text style={styles.consentLink} onPress={() => router.push("/privacy")}>
              {t.privacy}
            </Text>
            {t.consentSuffix}
          </Text>
        </View>
      </View>

      <Pressable style={styles.guestLink} onPress={() => router.replace("/community")}>
        <Text style={[styles.guestLinkText, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.continueAsGuest}</Text>
      </Pressable>

      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push("/terms")}>
          <Text style={[styles.legalLinkText, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.terms}</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>|</Text>
        <Pressable onPress={() => router.push("/privacy")}>
          <Text style={[styles.legalLinkText, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.privacy}</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>|</Text>
        <Pressable onPress={() => router.push("/tokusho")}>
          <Text style={[styles.legalLinkText, { fontFamily: fontBodyForUi(isJaUi) }]}>{t.legalNotice}</Text>
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

  policyCheckRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    paddingVertical: 4,
  },
  policyCheckBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.accent,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  policyCheckBoxOn: { backgroundColor: C.accent },
  policyCheckMark: { color: "#050505", fontSize: 14, fontWeight: "900" },
  policyCheckLabel: { flex: 1, color: C.textMuted, fontSize: 12, lineHeight: 18, fontFamily: "Courier Prime" },
  googleLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 4,
    paddingVertical: 16,
  },
  googleLoginBtnDisabled: { opacity: 0.45 },
  googleIcon: { width: 24, height: 24 },
  googleLoginText: { color: "#050505", fontSize: 16, fontWeight: "800", fontFamily: "Barlow Condensed" },
  consentWrap: { marginTop: 10, alignItems: "center" },
  consentText: { color: C.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16, fontFamily: "Courier Prime" },
  consentLink: { color: C.accent, textDecorationLine: "none" },

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
