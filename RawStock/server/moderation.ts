/**
 * コンテンツ自動モデレーション
 * Step 1: 正規表現で明らかな違反を即時ブロック
 * Step 2: 通過したものをLLM（Claude Haiku）で判定
 *
 * 返り値:
 *   { allowed: true }  → 投稿OK
 *   { allowed: false, reason: string } → ブロック
 */

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── Step 1: 正規表現フィルタ ──────────────────────────────────────────────

/** 電話番号パターン（国内・国際） */
const PHONE_PATTERN = /(\+?81[-\s]?|0)(\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/;

/** メールアドレスパターン */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

/** LINE ID / Instagramなど外部連絡先の誘導 */
const EXTERNAL_CONTACT_PATTERN =
  /line\s*id\s*[:：]?\s*\S+|insta\s*[:：]?\s*\S+|twitter\s*[:：]?\s*\S+|discord\s*[:：]?\s*\S+/i;

/** 住所・郵便番号 */
const ADDRESS_PATTERN = /〒?\d{3}[-－]\d{4}|[都道府県市区町村]\d+[-－\d]/;

/** 明らかなアダルトNGワード（最低限） */
const ADULT_KEYWORDS = [
  "援助交際", "パパ活", "ママ活", "セックス", "sex", "nude", "naked",
  "エロ", "AV", "風俗", "売春", "買春", "児童ポルノ", "loli", "ロリ",
];
const ADULT_PATTERN = new RegExp(ADULT_KEYWORDS.join("|"), "i");

/** 暴力・脅迫 */
const VIOLENCE_KEYWORDS = ["殺す", "死ね", "ぶっ殺", "爆破", "テロ", "自殺しろ"];
const VIOLENCE_PATTERN = new RegExp(VIOLENCE_KEYWORDS.join("|"), "i");

function regexFilter(text: string): { blocked: boolean; reason: string } {
  if (PHONE_PATTERN.test(text))
    return { blocked: true, reason: "電話番号と思われる情報が含まれています" };
  if (EMAIL_PATTERN.test(text))
    return { blocked: true, reason: "メールアドレスと思われる情報が含まれています" };
  if (EXTERNAL_CONTACT_PATTERN.test(text))
    return { blocked: true, reason: "外部連絡先の交換は禁止されています" };
  if (ADDRESS_PATTERN.test(text))
    return { blocked: true, reason: "住所・郵便番号と思われる情報が含まれています" };
  if (ADULT_PATTERN.test(text))
    return { blocked: true, reason: "アダルトコンテンツに関する投稿は禁止されています" };
  if (VIOLENCE_PATTERN.test(text))
    return { blocked: true, reason: "暴力・脅迫に関する投稿は禁止されています" };
  return { blocked: false, reason: "" };
}

// ── Step 2: LLM判定 ───────────────────────────────────────────────────────

const LLM_SYSTEM_PROMPT = `あなたはリアルタイムチャットのコンテンツモデレーターです。
投稿テキストを読み、以下の基準で判定してください。

ブロックすべき内容:
- 個人情報（電話番号・メール・住所・SNS ID等）の交換・要求
- アダルト・性的な内容
- 暴力・脅迫・差別的表現
- スパム・宣伝・フィッシング

判定結果はJSONのみ返してください（説明文不要）:
{"allowed":true|false,"reason":"理由（1文、allowedがfalseの場合のみ）"}`;

async function llmFilter(
  text: string
): Promise<{ allowed: boolean; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // APIキー未設定の場合はLLM判定をスキップして許可
    return { allowed: true, reason: "" };
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 128,
        system: LLM_SYSTEM_PROMPT,
        messages: [{ role: "user" as const, content: text }],
      }),
    });

    if (!res.ok) {
      // LLMエラー時は許可（サービス継続優先）
      console.error("Moderation LLM error:", res.status);
      return { allowed: true, reason: "" };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const raw = data.content?.[0]?.text?.trim() ?? "";
    const parsed = JSON.parse(raw) as { allowed?: boolean; reason?: string };
    return {
      allowed: parsed.allowed !== false,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    // パースエラー・ネットワークエラー時は許可
    return { allowed: true, reason: "" };
  }
}

// ── 公開API ───────────────────────────────────────────────────────────────

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * テキストを自動モデレーション。
 * 正規表現で即時ブロック → 通過したものをLLMで判定。
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) return { allowed: true };

  // Step 1: 正規表現フィルタ（高速・無料）
  const regexResult = regexFilter(text);
  if (regexResult.blocked) {
    return { allowed: false, reason: regexResult.reason };
  }

  // Step 2: LLM判定（精度高・コスト低）
  const llmResult = await llmFilter(text);
  if (!llmResult.allowed) {
    return { allowed: false, reason: llmResult.reason || "コミュニティガイドラインに違反する内容が含まれています" };
  }

  return { allowed: true };
}
