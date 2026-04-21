import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { apiRequest } from "@/lib/query-client";

interface PolicyTranslateBannerProps {
  /** ページ全文のプレーンテキスト（長文 1 つにまとめる→キャッシュ命中率と無料枠効率が最大化される） */
  text: string;
  /** 翻訳元言語（既知の場合のみ） */
  srcLang?: string;
  /** 翻訳先言語の override。未指定なら user.preferredLanguage が使われる */
  dstLang?: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "translated"; translated: string; fromCache: boolean }
  | { kind: "skipped" }
  | { kind: "error"; message: string };

interface TranslateApiResponse {
  text: string;
  skipped: boolean;
  skipReason: string | null;
  fromCache: boolean;
  error: boolean;
}

/**
 * 法務ページの先頭に置く「Translate page」バナー。
 * - 翻訳結果は本文の上に参考表示するだけで、原文 JSX には手を入れない。
 * - 法務翻訳は参考表示である旨の Disclaimer を常時併記。
 */
export function PolicyTranslateBanner({ text, srcLang, dstLang }: PolicyTranslateBannerProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const handlePress = async () => {
    if (state.kind === "loading") return;
    if (state.kind === "translated") {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await apiRequest("POST", "/api/translate", { text, srcLang, dstLang });
      const data = (await res.json()) as TranslateApiResponse;
      if (data.error) {
        setState({ kind: "error", message: "Translation unavailable" });
        return;
      }
      if (data.skipped) {
        setState({ kind: "skipped" });
        return;
      }
      setState({ kind: "translated", translated: data.text, fromCache: data.fromCache });
    } catch (e: unknown) {
      const status = (e as { status?: number } | undefined)?.status;
      const message =
        status === 429
          ? "Too many translation requests. Try again in a minute."
          : status === 401
            ? "Sign in to translate."
            : "Translation failed";
      setState({ kind: "error", message });
    }
  };

  let label = "Translate page";
  if (state.kind === "loading") label = "Translating…";
  else if (state.kind === "translated") label = "Hide translation";
  else if (state.kind === "skipped") label = "Already in your language";

  const buttonDisabled = state.kind === "loading" || state.kind === "skipped";

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={buttonDisabled}
        style={({ pressed }) => [
          styles.button,
          pressed && !buttonDisabled ? styles.buttonPressed : null,
          buttonDisabled ? styles.buttonDisabled : null,
        ]}
      >
        {state.kind === "loading" ? (
          <ActivityIndicator size="small" color={C.text} />
        ) : (
          <Ionicons
            name={state.kind === "error" ? "alert-circle-outline" : "language-outline"}
            size={14}
            color={C.text}
          />
        )}
        <Text style={styles.buttonText}>{label}</Text>
        {state.kind === "translated" && state.fromCache ? (
          <Text style={styles.cachedBadge}>· cached</Text>
        ) : null}
      </Pressable>
      <Text style={styles.disclaimer}>
        Translations are auto-generated for reference only. The English original is the legally binding version.
      </Text>
      {state.kind === "error" ? <Text style={styles.errorText}>{state.message}</Text> : null}
      {state.kind === "translated" ? (
        <View style={styles.translatedCard}>
          <Text style={styles.translatedText}>{state.translated}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default PolicyTranslateBanner;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 12,
    backgroundColor: C.surface,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 8,
    backgroundColor: C.surface2,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    letterSpacing: 0.4,
  },
  cachedBadge: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.textMuted,
  },
  disclaimer: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.textMuted,
    marginTop: 8,
    lineHeight: 15,
  },
  errorText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.live,
    marginTop: 6,
  },
  translatedCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  translatedText: {
    fontFamily: F.mono,
    fontSize: 13,
    lineHeight: 19,
    color: C.text,
  },
});
