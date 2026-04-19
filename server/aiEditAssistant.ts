/**
 * AI Edit Assistant — generates an Edit Decision List (EDL) using Claude.
 * Accepts rich job input including multiple videos, logo, telop, audience, and tone.
 */
import type { AIEditProvider, EditPlan } from "../shared/ai-edit";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type EditJobInput = {
  planMinutes: 15 | 30 | 45 | 60;
  videoUrls: string[];
  logoUrl?: string | null;
  telop?: string | null;
  targetAudience?: string | null;
  tone?: string | null;
  prompt: string;
};

export type EditPlanGeneration = {
  plan: EditPlan;
  provider: AIEditProvider;
};

const SYSTEM_PROMPT = `You are a professional video editor AI assistant.
Given a set of source video files and detailed editing instructions, generate a structured Edit Decision List (EDL).

Rules:
- Include 5–12 edit points in the edl array, proportional to the output duration target
- Each entry must include a timestamp range, type, and clear actionable instruction
- type must be one of: "cut" | "highlight" | "transition" | "caption"
- startTime / endTime must be in "MM:SS" format (e.g. "03:45")
- If a logo or telop text is provided, incorporate them into caption entries
- Adapt pacing and style to the specified target audience and tone
- Output ONLY valid JSON — no explanation text, no markdown fences

Response format (strict JSON):
{
  "title": "Edit plan name",
  "totalDuration": "X:XX",
  "summary": "One or two sentence overview of this edit plan.",
  "edl": [
    {
      "index": 1,
      "startTime": "00:00",
      "endTime": "00:30",
      "type": "highlight",
      "instruction": "Opening: strongest performance moment to hook viewers",
      "note": "Optional directorial note"
    }
  ]
}`;

function getMockEditPlan(input: EditJobInput): EditPlan {
  const { planMinutes, prompt, targetAudience, tone, videoUrls, telop } = input;
  return {
    title: `AI Edit Plan — ${prompt.slice(0, 30)}`,
    totalDuration: `${planMinutes}:00`,
    summary: `A ${tone ?? "energetic"} cut targeting ${targetAudience ?? "general audience"}, generated from ${videoUrls.length} source file(s). (Mock data — set ANTHROPIC_API_KEY to enable live generation)`,
    edl: [
      {
        index: 1,
        startTime: "00:00",
        endTime: "00:25",
        type: "highlight",
        instruction: "Opening: most impactful performance moment to hook viewers",
        note: "Start at the peak energy point of the first video",
      },
      {
        index: 2,
        startTime: "01:10",
        endTime: "01:45",
        type: "cut",
        instruction: "Solo section close-up — tight hand and face shots",
        note: "Prioritize intimate camera angles",
      },
      {
        index: 3,
        startTime: "02:30",
        endTime: "02:50",
        type: "transition",
        instruction: "Cross-fade to audience reaction shot",
        note: "Soften energy before the mid-section",
      },
      {
        index: 4,
        startTime: "03:05",
        endTime: "03:20",
        type: "caption",
        instruction: telop
          ? `Insert telop: "${telop}"`
          : "Insert song title and artist name caption",
        note: "White text, lower-left position, 3-second hold",
      },
      {
        index: 5,
        startTime: "04:15",
        endTime: "04:55",
        type: "highlight",
        instruction: "Climax: full-band wide shot with crowd energy",
        note: "Alternate wide and close-up cuts every 2 seconds",
      },
      {
        index: 6,
        startTime: `${planMinutes - 1}:00`,
        endTime: `${planMinutes}:00`,
        type: "cut",
        instruction: "Outro: fade to black",
        note: "Gradually lower audio volume over final 10 seconds",
      },
    ],
  };
}

function buildUserMessage(input: EditJobInput): string {
  const { planMinutes, videoUrls, logoUrl, telop, targetAudience, tone, prompt } = input;
  const lines: string[] = [
    `Output duration target: ${planMinutes} minutes`,
    `Target audience: ${targetAudience ?? "General"}`,
    `Tone / Style: ${tone ?? "Energetic"}`,
    "",
    `Source videos (${videoUrls.length}):`,
    ...videoUrls.map((url, i) => `  ${i + 1}. ${url}`),
  ];
  if (logoUrl) lines.push("", `Logo (transparent PNG): ${logoUrl}`);
  if (telop) lines.push(`Telop / caption text: "${telop}"`);
  lines.push("", "Editing instructions:", prompt);
  return lines.join("\n");
}

function allowMockEditPlan(): boolean {
  return process.env.AI_EDIT_ALLOW_MOCK === "1";
}

function withMockFallback(input: EditJobInput, reason: string): EditPlanGeneration {
  if (!allowMockEditPlan()) {
    throw new Error(reason);
  }
  console.warn(`[aiEditAssistant] ${reason} — returning mock EDL`);
  return { plan: getMockEditPlan(input), provider: "mock" };
}

export async function generateEditPlan(input: EditJobInput): Promise<EditPlanGeneration> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return withMockFallback(
      input,
      "ANTHROPIC_API_KEY is not set. Set AI_EDIT_ALLOW_MOCK=1 to use mock plans locally",
    );
  }

  const userMessage = buildUserMessage(input);

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user" as const, content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[aiEditAssistant] Claude API error:", res.status, errText);
      return withMockFallback(input, `Claude API error (${res.status})`);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.[0]?.text?.trim() ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return withMockFallback(input, "No JSON found in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as EditPlan;
    if (!parsed.edl || !Array.isArray(parsed.edl)) {
      return withMockFallback(input, "Claude response did not contain a valid EDL array");
    }
    return { plan: parsed, provider: "anthropic" };
  } catch (e) {
    console.error("[aiEditAssistant] Error calling Claude:", e);
    const msg = e instanceof Error ? e.message : "Claude call failed";
    return withMockFallback(input, msg);
  }
}
