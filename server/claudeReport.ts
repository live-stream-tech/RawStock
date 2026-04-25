/**
 * Automated report triage via Claude API.
 * Model: claude-haiku-4-5-20251001
 * Response: verdict (clear_violation | gray_zone | no_violation), reason
 */

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type Verdict = "clear_violation" | "gray_zone" | "no_violation";

export type ClaudeReportResult = {
  verdict: Verdict;
  reason: string;
};

const SYSTEM_PROMPT = `You are a content moderation judge.
Based on the reporter's selected reason, decide whether the post or comment text matches any of the following.

Criteria:
- Spam: ads, promos, phishing, unrelated repetition
- Harassment: insults, bullying, discriminatory language, personal attacks
- Sexual content: explicit sexual material, inappropriate content involving minors
- Violent content: threats, glorification of violence, graphic gore

Return exactly one of the three verdicts below. Reply with JSON only, no prose.
- clear_violation: clearly violates policy (clearly matches one of the above)
- gray_zone: ambiguous or context-dependent
- no_violation: does not match (possible mistaken report)

Return shape (JSON only):
{"verdict":"clear_violation"|"gray_zone"|"no_violation","reason":"short reason (one sentence)"}`;

export async function judgeReportContent(
  contentText: string,
  userReason: string
): Promise<ClaudeReportResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { verdict: "gray_zone", reason: "API key not set; queued for manual review." };
  }

  const userPrompt = `Report reason: ${userReason}\n\nTarget text:\n${contentText}`;

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
    return { verdict: "gray_zone", reason: `API error (${res.status}); queued for manual review.` };
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
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
  return { verdict: "gray_zone", reason: "Could not parse verdict; queued for manual review." };
}
