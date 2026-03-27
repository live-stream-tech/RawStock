/**
 * 通報コンテンツのClaude APIによる自動判定。
 * モデル: claude-haiku-4-5-20251001
 * レスポンス: verdict (clear_violation | gray_zone | no_violation), reason
 */

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type Verdict = "clear_violation" | "gray_zone" | "no_violation";

export type ClaudeReportResult = {
  verdict: Verdict;
  reason: string;
};

const SYSTEM_PROMPT = `あなたはコンテンツモデレーションの判定者です。
ユーザーが選択した通報理由に基づき、投稿またはコメントのテキストが以下のいずれかに該当するか判定してください。

判定基準:
- スパム: 広告・宣伝・フィッシング・無関係な繰り返し
- ハラスメント: 誹謗中傷・いじめ・差別的表現・個人攻撃
- 性的コンテンツ: 露骨な性的表現・児童に関連する不適切な内容
- 暴力的コンテンツ: 脅迫・暴力の助長・グロテスクな描写

判定結果は必ず以下の3種類のいずれか1つだけを返してください。JSONのみを返し、説明文は不要です。
- clear_violation: 明らかに規約違反（上記のいずれかに明確に該当）
- gray_zone: グレーゾーン（判断が難しい、文脈次第）
- no_violation: 違反なし（該当しない、誤通報の可能性)

返却形式（このJSON形式のみ）:
{"verdict":"clear_violation"|"gray_zone"|"no_violation","reason":"短い理由（1文）"}`;

export async function judgeReportContent(
  contentText: string,
  userReason: string
): Promise<ClaudeReportResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { verdict: "gray_zone", reason: "APIキー未設定のため管理者確認に回しました。" };
  }

  const userPrompt = `通報理由: ${userReason}\n\n対象テキスト:\n${contentText}`;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Claude API error:", res.status, errText);
    return { verdict: "gray_zone", reason: `APIエラー(${res.status})のため管理者確認に回しました。` };
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.[0]?.text?.trim() ?? "";
  try {
    const parsed = JSON.parse(text) as { verdict?: string; reason?: string };
    const verdict = parsed.verdict as Verdict | undefined;
    if (
      verdict === "clear_violation" ||
      verdict === "gray_zone" ||
      verdict === "no_violation"
    ) {
      return {
        verdict,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
      };
    }
  } catch {
    // JSON parse failed
  }
  return { verdict: "gray_zone", reason: "判定結果の取得に失敗したため管理者確認に回しました。" };
}
