import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getLoginReturn } from "@/lib/login-return";
import { C } from "@/constants/colors";

/**
 * ポップアップが window.opener を持てない環境（外部OAuthがopenerを切断する場合）のフォールバック。
 * /auth/popup-fallback?token=... にリダイレクトされた場合にトークンを処理する。
 *
 * このページがポップアップ内で動作している場合:
 *   → window.opener にpostMessageを送ってメインウィンドウを更新し、ポップアップを閉じる
 * このページがメインウィンドウで動作している場合（ポップアップが使えない環境）:
 *   → 直接loginWithTokenを呼んでログイン処理する
 */
export default function PopupFallbackScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "web" || !token) {
      router.replace("/auth/login" as any);
      return;
    }

    // ポップアップウィンドウ内かどうかを確認
    const isPopup =
      typeof window !== "undefined" &&
      window.opener != null &&
      !window.opener.closed;

    if (isPopup) {
      // ポップアップ内: openerにpostMessageを送ってメインウィンドウを更新
      try {
        window.opener.postMessage(
          { type: "auth_success", token },
          window.location.origin
        );
        setTimeout(() => window.close(), 300);
        return;
      } catch {
        // postMessageが失敗した場合は直接ログイン処理にフォールスルー
      }
    }

    // メインウィンドウ内（またはpostMessage失敗時）: 直接ログイン処理
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
