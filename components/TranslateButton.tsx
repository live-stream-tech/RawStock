import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { F } from "@/constants/fonts";
import { apiRequest } from "@/lib/query-client";

interface TranslateButtonProps {
  text: string;
  /** 翻訳元言語（既知の場合のみ）。未指定ならサーバ側で franc 検知 */
  srcLang?: string;
  /** 翻訳先言語の override。未指定なら user.preferredLanguage が使われる */
  dstLang?: string;
  /** 翻訳結果カードのテキスト色を上書きしたい場合 */
  textColor?: string;
  /** ボタン部分を控えめ表示にしたい場合 */
  compact?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "translated"; translated: string; showOriginal: boolean; fromCache: boolean }
  | { kind: "skipped"; reason: string }
  | { kind: "error"; message: string };

interface TranslateApiResponse {
  text: string;
  skipped: boolean;
  skipReason: string | null;
  fromCache: boolean;
  error: boolean;
}

/**
 * チャット行・DM・コメント・投稿等の末尾に置く Translate ボタン（React Native）。
 * 短語スキップ・glossary・キャッシュは全部サーバ側で処理する。
 */
export function TranslateButton({
  text,
  srcLang,
  dstLang,
  textColor,
  compact,
}: TranslateButtonProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;

  const handlePress = async () => {
    if (state.kind === "loading") return;
    if (state.kind === "translated") {
      setState({ ...state, showOriginal: !state.showOriginal });
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
        setState({ kind: "skipped", reason: data.skipReason ?? "skipped" });
        return;
      }
      setState({
        kind: "translated",
        translated: data.text,
        showOriginal: false,
        fromCache: data.fromCache,
      });
    } catch (e: unknown) {
      const status = (e as { status?: number } | undefined)?.status;
      const msg =
        status === 429
          ? "Too many translation requests. Try again in a minute."
          : status === 401
            ? "Sign in to translate."
            : "Translation failed";
      setState({ kind: "error", message: msg });
    }
  };

  let label = "Translate";
  if (state.kind === "loading") label = "Translating…";
  else if (state.kind === "translated") label = state.showOriginal ? "Show translation" : "Show original";
  else if (state.kind === "error") label = "Retry";
  else if (state.kind === "skipped") label = "Already in your language";

  const showTranslated =
    state.kind === "translated" && !state.showOriginal ? state.translated : null;

  const buttonDisabled = state.kind === "loading" || state.kind === "skipped";

  return (
    <View>
      {showTranslated && (
        <View style={styles.translatedBubble}>
          <Text style={[styles.translatedText, textColor ? { color: textColor } : null]}>
            {showTranslated}
          </Text>
        </View>
      )}
      <Pressable
        onPress={handlePress}
        disabled={buttonDisabled}
        style={({ pressed }) => [
          styles.button,
          compact ? styles.buttonCompact : null,
          pressed && !buttonDisabled ? styles.buttonPressed : null,
          buttonDisabled ? styles.buttonDisabled : null,
        ]}
      >
        {state.kind === "loading" ? (
          <ActivityIndicator size="small" color={C.textSec} />
        ) : (
          <Ionicons
            name={state.kind === "error" ? "alert-circle-outline" : "language-outline"}
            size={12}
            color={C.textSec}
          />
        )}
        <Text style={styles.buttonText}>{label}</Text>
        {state.kind === "translated" && state.fromCache ? (
          <Text style={styles.cachedBadge}>· cached</Text>
        ) : null}
      </Pressable>
      {state.kind === "error" ? (
        <Text style={styles.errorText}>{state.message}</Text>
      ) : null}
    </View>
  );
}

export default TranslateButton;

const styles = StyleSheet.create({
  translatedBubble: {
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  translatedText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    lineHeight: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  buttonCompact: {
    paddingVertical: 0,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.textSec,
  },
  cachedBadge: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.textMuted,
  },
  errorText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.live,
    marginTop: 2,
  },
});
