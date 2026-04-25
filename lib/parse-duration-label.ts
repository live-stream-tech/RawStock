/**
 * Parse UI duration labels (e.g. "3:22", "1:05:30", or seconds-only "90") into total seconds.
 */
export function parseDurationLabelToSec(label: string | null | undefined): number | null {
  if (label == null || typeof label !== "string") return null;
  const s = label.trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "")) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return nums[0];
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  if (parts.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  return null;
}
