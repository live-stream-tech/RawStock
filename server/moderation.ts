/**
 * Automated content moderation.
 * Step 1: Fast regex for obvious violations
 * Step 2: LLM (Claude Haiku) for nuanced cases
 *
 * Returns:
 *   { allowed: true }  → OK to post
 *   { allowed: false, reason: string } → blocked
 */

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── Step 1: Regex filter ──────────────────────────────────────────────

/** Phone numbers (JP-style and generic) */
const PHONE_PATTERN = /(\+?81[-\s]?|0)(\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

/** External contact handles */
const EXTERNAL_CONTACT_PATTERN =
  /line\s*id\s*[:：]?\s*\S+|insta\s*[:：]?\s*\S+|twitter\s*[:：]?\s*\S+|discord\s*[:：]?\s*\S+/i;

/** Address / postal code (JP) */
const ADDRESS_PATTERN = /〒?\d{3}[-－]\d{4}|[都道府県市区町村]\d+[-－\d]/;

/** Adult / sexual keywords (JP + EN) */
const ADULT_KEYWORDS = [
  "援助交際", "パパ活", "ママ活", "セックス", "sex", "nude", "naked",
  "エロ", "AV", "風俗", "売春", "買春", "児童ポルノ", "loli", "ロリ",
];
const ADULT_PATTERN = new RegExp(ADULT_KEYWORDS.join("|"), "i");

/** Violence / threats (JP + romanized) */
const VIOLENCE_KEYWORDS = ["殺す", "死ね", "ぶっ殺", "爆破", "テロ", "自殺しろ"];
const VIOLENCE_PATTERN = new RegExp(VIOLENCE_KEYWORDS.join("|"), "i");

function regexFilter(text: string): { blocked: boolean; reason: string } {
  if (PHONE_PATTERN.test(text))
    return { blocked: true, reason: "Posts must not include phone numbers." };
  if (EMAIL_PATTERN.test(text))
    return { blocked: true, reason: "Posts must not include email addresses." };
  if (EXTERNAL_CONTACT_PATTERN.test(text))
    return { blocked: true, reason: "Sharing external contact info is not allowed." };
  if (ADDRESS_PATTERN.test(text))
    return { blocked: true, reason: "Posts must not include addresses or postal codes." };
  if (ADULT_PATTERN.test(text))
    return { blocked: true, reason: "Adult or sexual content is not allowed." };
  if (VIOLENCE_PATTERN.test(text))
    return { blocked: true, reason: "Violence or threats are not allowed." };
  return { blocked: false, reason: "" };
}

// ── Step 2: LLM filter ───────────────────────────────────────────────────

const LLM_SYSTEM_PROMPT = `You are a real-time chat moderator.
Read the user's message and decide if it should be blocked.

Block messages that contain or solicit:
- Personal info (phone, email, address, social handles) exchange or requests
- Adult or sexual content
- Violence, threats, or hate
- Spam, scams, or phishing

Reply with JSON only (no prose):
{"allowed":true|false,"reason":"One short English sentence when allowed is false"}`;

async function llmFilter(
  text: string
): Promise<{ allowed: boolean; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
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
    return { allowed: true, reason: "" };
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) return { allowed: true };

  const regexResult = regexFilter(text);
  if (regexResult.blocked) {
    return { allowed: false, reason: regexResult.reason };
  }

  const llmResult = await llmFilter(text);
  if (!llmResult.allowed) {
    return { allowed: false, reason: llmResult.reason || "This content violates community guidelines." };
  }

  return { allowed: true };
}
