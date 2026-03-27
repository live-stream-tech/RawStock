/**
 * AI Edit Assistant — generates an Edit Decision List (EDL) using Claude Haiku.
 * Follows the same pattern as server/claudeReport.ts.
 */

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type EDLItem = {
  index: number;
  startTime: string;
  endTime: string;
  type: "cut" | "highlight" | "transition" | "caption";
  instruction: string;
  note?: string;
};

export type EditPlan = {
  title: string;
  totalDuration: string;
  summary: string;
  edl: EDLItem[];
};

const SYSTEM_PROMPT = `あなたはプロの動画編集アシスタントです。
ユーザーが提供した動画URLとプロンプト（編集指示）を受け取り、Edit Decision List（EDL）を生成してください。

EDLは動画の編集プランをJSONで返します。以下のルールに従ってください：
- edl配列に5〜10個の編集ポイントを含める
- 各エントリはカット箇所・タイムスタンプ・演出指示を含む
- type は "cut" | "highlight" | "transition" | "caption" のいずれか
- startTime / endTime は "MM:SS" 形式

返却形式（このJSON形式のみ、説明文不要）:
{
  "title": "編集プランのタイトル",
  "totalDuration": "3:00",
  "summary": "このEDLの概要（1〜2文）",
  "edl": [
    {
      "index": 1,
      "startTime": "00:00",
      "endTime": "00:30",
      "type": "highlight",
      "instruction": "オープニング：迫力ある演奏シーン",
      "note": "ギターの手元をアップで"
    }
  ]
}`;

function getMockEditPlan(videoUrl: string, prompt: string): EditPlan {
  return {
    title: `AI編集プラン — ${prompt.slice(0, 30)}`,
    totalDuration: "3:00",
    summary: "AIがプロンプトを分析し、動画のベストシーンを自動選出しました（モックデータ）。",
    edl: [
      {
        index: 1,
        startTime: "00:00",
        endTime: "00:25",
        type: "highlight",
        instruction: "オープニング：最も盛り上がる演奏シーン",
        note: "テンポの速い曲頭を使用",
      },
      {
        index: 2,
        startTime: "01:10",
        endTime: "01:45",
        type: "cut",
        instruction: "ソロパート：ギターソロのクローズアップ",
        note: "手元をアップで撮影した箇所を優先",
      },
      {
        index: 3,
        startTime: "02:30",
        endTime: "02:50",
        type: "transition",
        instruction: "クロスフェードで場面転換",
        note: "観客の反応カットへつなぐ",
      },
      {
        index: 4,
        startTime: "03:05",
        endTime: "03:20",
        type: "caption",
        instruction: "テロップ挿入：曲名とアーティスト名",
        note: "白文字・左下配置",
      },
      {
        index: 5,
        startTime: "04:15",
        endTime: "04:55",
        type: "highlight",
        instruction: "クライマックス：フィナーレの演奏",
        note: "広角ショットと手元の交互カット",
      },
      {
        index: 6,
        startTime: "05:30",
        endTime: "06:00",
        type: "cut",
        instruction: "エンディング：フェードアウト",
        note: "静かに音量を下げながらフェード",
      },
    ],
  };
}

export async function generateEditPlan(videoUrl: string, prompt: string): Promise<EditPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[aiEditAssistant] ANTHROPIC_API_KEY not set — returning mock EDL");
    return getMockEditPlan(videoUrl, prompt);
  }

  const userPrompt = `動画URL: ${videoUrl}\n\n編集指示: ${prompt}`;

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
        messages: [{ role: "user" as const, content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[aiEditAssistant] Claude API error:", res.status, errText);
      return getMockEditPlan(videoUrl, prompt);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.[0]?.text?.trim() ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[aiEditAssistant] No JSON found in Claude response");
      return getMockEditPlan(videoUrl, prompt);
    }

    const parsed = JSON.parse(jsonMatch[0]) as EditPlan;
    if (!parsed.edl || !Array.isArray(parsed.edl)) {
      return getMockEditPlan(videoUrl, prompt);
    }
    return parsed;
  } catch (e) {
    console.error("[aiEditAssistant] Error calling Claude:", e);
    return getMockEditPlan(videoUrl, prompt);
  }
}
