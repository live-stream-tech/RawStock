import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getLoginReturn } from "@/lib/login-return";
import { C } from "@/constants/colors";

/**
 * 同一タブリダイレクト方式のOAuth認証コールバックページ。
 * サーバーが /auth/callback?token=xxx にリダイレクトしてくる。
 *
 * ポップアップウィンドウ内で動作している場合（Google OAuthなど）:
 *   → window.opener にpostMessageを送ってメインウィンドウを更新し、ポップアップを閉じる
 * 同一タブで動作している場合（ログインページからのリダイレクト）:
 *   → 直接loginWithTokenを呼んでログイン処理する
 */
export default function AuthCallbackScreen() {
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      router.replace("/auth/login" as any);
      return;
    }

    // URLSearchParamsから直接tokenを取得（Expo Routerの遅延を回避）
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      router.replace("/auth/login?auth_error=me_failed" as any);
      return;
    }

    // ポップアップウィンドウ内かどうかを確認
    const isPopup =
      typeof window !== "undefined" &&
      window.opener != null &&
      !window.opener.closed;

    if (isPopup) {
      // ポップアップ内: openerにpostMessageを送ってメインウィンドウを更新し、ポップアップを閉じる
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

    // 同一タブ（またはpostMessage失敗時）: 直接ログイン処理
    let cancelled = false;
    (async () => {
      try {
        await loginWithToken(token);
        if (cancelled) return;
        const saved = getLoginReturn();
        let returnTo = saved ?? "/(tabs)/profile";
        // ログイン後のデフォルト遷移先として不適切なパスを除外
        const isInvalidReturn =
          returnTo.startsWith("/auth/") ||
          returnTo.startsWith("/jukebox") ||
          returnTo.startsWith("/lp") ||
          returnTo.startsWith("/rawstock-lp") ||
          returnTo.startsWith("/terms") ||
          returnTo.startsWith("/privacy") ||
          returnTo.startsWith("/dmca") ||
          returnTo.startsWith("/legal-notice") ||
          returnTo.startsWith("/tokusho");
        if (isInvalidReturn) returnTo = "/(tabs)/profile";
        router.replace(returnTo as any);
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
