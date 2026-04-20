import { useState } from "react";
import { Languages, Loader2, AlertCircle } from "lucide-react";

interface TranslateButtonProps {
  text: string;
  /** 翻訳元言語（既知の場合のみ）。未指定ならサーバ側で franc 検知 */
  srcLang?: string;
  /** 翻訳先言語の override。未指定なら user.preferredLanguage が使われる */
  dstLang?: string;
  className?: string;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "translated"; translated: string; showOriginal: boolean; fromCache: boolean }
  | { kind: "skipped"; reason: string }
  | { kind: "error"; message: string };

/**
 * チャット行などの末尾に置く「Translate」ボタン。
 * - 短語スキップ・glossary・キャッシュは全部サーバ側で処理する。
 * - skipped が返ってきた場合は静かに何もしないか、控えめに「Already in your language」と表示する。
 * - 翻訳後は「Show original」トグルで原文表示に戻せる。
 */
export function TranslateButton({ text, srcLang, dstLang, className }: TranslateButtonProps) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;

  async function handleClick() {
    if (state.kind === "loading") return;
    if (state.kind === "translated") {
      setState({ ...state, showOriginal: !state.showOriginal });
      return;
    }
    setState({ kind: "loading" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, srcLang, dstLang }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          res.status === 429
            ? "Too many translation requests. Try again in a minute."
            : body?.error ?? `Translation failed (${res.status})`;
        setState({ kind: "error", message: msg });
        return;
      }
      const data = (await res.json()) as {
        text: string;
        skipped: boolean;
        skipReason: string | null;
        fromCache: boolean;
        error: boolean;
      };
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
    } catch {
      setState({ kind: "error", message: "Network error" });
    }
  }

  let label = "Translate";
  let icon = <Languages size={11} />;
  if (state.kind === "loading") {
    label = "Translating…";
    icon = <Loader2 size={11} className="animate-spin" />;
  } else if (state.kind === "translated") {
    label = state.showOriginal ? "Show translation" : "Show original";
  } else if (state.kind === "error") {
    label = "Retry";
    icon = <AlertCircle size={11} />;
  } else if (state.kind === "skipped") {
    label = "Already in your language";
  }

  const showTranslated =
    state.kind === "translated" && !state.showOriginal ? state.translated : null;

  return (
    <div className={className}>
      {showTranslated && (
        <div className="text-[12px] text-white/85 bg-white/5 border border-white/10 rounded-lg px-2 py-1 mb-0.5 break-words">
          {showTranslated}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={state.kind === "loading" || state.kind === "skipped"}
        className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 transition-colors disabled:opacity-50"
      >
        {icon}
        <span>{label}</span>
        {state.kind === "translated" && state.fromCache && (
          <span className="text-white/30">· cached</span>
        )}
      </button>
      {state.kind === "error" && (
        <span className="ml-2 text-[10px] text-red-400/80">{state.message}</span>
      )}
    </div>
  );
}

export default TranslateButton;
