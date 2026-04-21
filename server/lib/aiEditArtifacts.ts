import {
  rawStockClipEnergy,
  sortRawStockClipsByStart,
  type RawStockClip,
  type RawStockVideoSpec,
} from "../../shared/rawstock-video-spec";
import type {
  AIEditAnalysis,
  AIEditAnalysisSegment,
  AIEditProvider,
  AIEditStoredResult,
  EDLItem,
  EditPlan,
} from "../../shared/ai-edit";

function parseTimestampToSeconds(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

function clipTypeFromEDL(item: EDLItem, index: number): RawStockClip["type"] {
  if (item.type === "highlight") return index === 0 ? "hook" : "drop";
  if (item.type === "transition") return "crowd";
  if (item.type === "caption") return "chorus";
  return index === 0 ? "hook" : "chorus";
}

function energyFromEDLType(type: EDLItem["type"]) {
  switch (type) {
    case "highlight":
      return rawStockClipEnergy(0.9);
    case "transition":
      return rawStockClipEnergy(0.35);
    case "caption":
      return rawStockClipEnergy(0.45);
    case "cut":
    default:
      return rawStockClipEnergy(0.65);
  }
}

function clipDuration(clip: RawStockClip): number {
  const start = clip.sourceStart ?? clip.start;
  const end = clip.sourceEnd ?? clip.end;
  return Math.max(0, end - start);
}

function buildSegmentsFromPlan(
  baseSpec: RawStockVideoSpec,
  plan: EditPlan,
): { clips: RawStockClip[]; segments: AIEditAnalysisSegment[] } {
  const clips: RawStockClip[] = [];
  const segments: AIEditAnalysisSegment[] = [];
  let outputCursor = 0;

  for (const [itemIdx, item] of plan.edl.entries()) {
    const timelineStart = parseTimestampToSeconds(item.startTime);
    const timelineEnd = parseTimestampToSeconds(item.endTime);
    if (timelineStart == null || timelineEnd == null || timelineEnd <= timelineStart) {
      continue;
    }

    for (const baseClip of baseSpec.clips) {
      const overlapStart = Math.max(timelineStart, baseClip.start);
      const overlapEnd = Math.min(timelineEnd, baseClip.end);
      if (overlapEnd <= overlapStart) continue;

      const baseSourceStart = baseClip.sourceStart ?? baseClip.start;
      const sourceStart = baseSourceStart + (overlapStart - baseClip.start);
      const sourceEnd = sourceStart + (overlapEnd - overlapStart);
      const duration = overlapEnd - overlapStart;

      const clip: RawStockClip = {
        start: outputCursor,
        end: outputCursor + duration,
        type: clipTypeFromEDL(item, itemIdx),
        energy: energyFromEDLType(item.type),
        intent: item.instruction.trim() || item.note?.trim() || undefined,
        sourceIndex: baseClip.sourceIndex ?? 0,
        sourceStart,
        sourceEnd,
      };
      clips.push(clip);
      segments.push({
        itemIndex: item.index,
        sourceIndex: clip.sourceIndex ?? 0,
        outputStartSec: clip.start,
        outputEndSec: clip.end,
        sourceStartSec: sourceStart,
        sourceEndSec: sourceEnd,
        edlType: item.type,
      });
      outputCursor += duration;
    }
  }

  return { clips, segments };
}

function buildAnalysis(
  provider: AIEditProvider,
  baseSpec: RawStockVideoSpec,
  renderSpec: RawStockVideoSpec,
  segments: AIEditAnalysisSegment[],
): AIEditAnalysis {
  const sourceDurations = new Map<number, number>();
  for (const clip of baseSpec.clips) {
    const sourceIndex = clip.sourceIndex ?? 0;
    const duration = clipDuration(clip);
    sourceDurations.set(sourceIndex, (sourceDurations.get(sourceIndex) ?? 0) + duration);
  }

  const selectedBySource = new Map<number, { count: number; duration: number }>();
  for (const segment of segments) {
    const entry = selectedBySource.get(segment.sourceIndex) ?? { count: 0, duration: 0 };
    entry.count += 1;
    entry.duration += Math.max(0, segment.sourceEndSec - segment.sourceStartSec);
    selectedBySource.set(segment.sourceIndex, entry);
  }

  const warnings: string[] = [];
  if (provider === "mock") {
    warnings.push("AI provider is running in mock mode. Review the edit plan carefully before rendering.");
  }
  if (segments.length === 0) {
    warnings.push("The AI plan did not map to any source segment, so the original order spec is being used.");
  }
  if ((new Set(renderSpec.clips.map((clip) => clip.sourceIndex ?? 0))).size > 1) {
    warnings.push("This edit uses multiple source files. Verify the template supports all referenced video layers.");
  }

  return {
    version: 1,
    provider,
    renderPath: "templated",
    renderReady: renderSpec.clips.length > 0,
    warnings,
    nextSteps: [
      "scene_detection",
      "shot_classification",
      "audio_beat_detection",
      "highlight_scoring",
    ],
    sources: [...sourceDurations.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([sourceIndex, durationSec]) => ({
        sourceIndex,
        durationSec,
        selectedClipCount: selectedBySource.get(sourceIndex)?.count ?? 0,
        selectedDurationSec: selectedBySource.get(sourceIndex)?.duration ?? 0,
      })),
    segments,
  };
}

export function buildAIEditStoredResult(params: {
  plan: EditPlan;
  promptUsed: string;
  provider: AIEditProvider;
  baseSpec: RawStockVideoSpec;
  revisionPrompt?: string | null;
}): AIEditStoredResult {
  const { plan, promptUsed, provider, baseSpec, revisionPrompt } = params;
  const { clips, segments } = buildSegmentsFromPlan(baseSpec, plan);
  const renderSpec: RawStockVideoSpec =
    clips.length > 0
      ? {
          clips: sortRawStockClipsByStart(clips),
          style: baseSpec.style,
          format: baseSpec.format,
          overlays: baseSpec.overlays,
          duration: clips[clips.length - 1]?.end ?? 0,
        }
      : baseSpec;

  return {
    schemaVersion: "ai-edit-result-v1",
    generatedAt: new Date().toISOString(),
    promptUsed,
    revisionPrompt: revisionPrompt?.trim() || null,
    plan,
    renderSpec,
    baseSpec,
    analysis: buildAnalysis(provider, baseSpec, renderSpec, segments),
  };
}

export function parseAIEditStoredResult(json: string | null): AIEditStoredResult | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as Partial<AIEditStoredResult>;
    if (parsed?.schemaVersion !== "ai-edit-result-v1") return null;
    if (!parsed.plan || !Array.isArray(parsed.plan.edl)) return null;
    if (!parsed.renderSpec || !Array.isArray(parsed.renderSpec.clips)) return null;
    if (!parsed.baseSpec || !Array.isArray(parsed.baseSpec.clips)) return null;
    if (!parsed.analysis || !Array.isArray(parsed.analysis.sources) || !Array.isArray(parsed.analysis.segments)) {
      return null;
    }
    return parsed as AIEditStoredResult;
  } catch {
    return null;
  }
}
