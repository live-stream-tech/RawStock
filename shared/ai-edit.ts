import type { RawStockVideoSpec } from "./rawstock-video-spec";

export type EDLItemType = "cut" | "highlight" | "transition" | "caption";

export type EDLItem = {
  index: number;
  startTime: string;
  endTime: string;
  type: EDLItemType;
  instruction: string;
  note?: string;
};

export type EditPlan = {
  title: string;
  totalDuration: string;
  summary: string;
  edl: EDLItem[];
};

export type AIEditProvider = "anthropic" | "mock";

export type AIEditAnalysisSource = {
  sourceIndex: number;
  durationSec: number;
  selectedClipCount: number;
  selectedDurationSec: number;
};

export type AIEditAnalysisSegment = {
  itemIndex: number;
  sourceIndex: number;
  outputStartSec: number;
  outputEndSec: number;
  sourceStartSec: number;
  sourceEndSec: number;
  edlType: EDLItemType;
};

export type AIEditAnalysis = {
  version: 1;
  provider: AIEditProvider;
  renderPath: "templated";
  renderReady: boolean;
  warnings: string[];
  nextSteps: string[];
  sources: AIEditAnalysisSource[];
  segments: AIEditAnalysisSegment[];
};

export type AIEditStoredResult = {
  schemaVersion: "ai-edit-result-v1";
  generatedAt: string;
  promptUsed: string;
  revisionPrompt?: string | null;
  plan: EditPlan;
  renderSpec: RawStockVideoSpec;
  baseSpec: RawStockVideoSpec;
  analysis: AIEditAnalysis;
};
