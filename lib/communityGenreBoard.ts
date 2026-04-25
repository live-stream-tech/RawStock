/** Shared genre filter for community lists and announcement-board UI rules. */
export const GENRE_TO_CATEGORY: Record<string, readonly string[]> = {
  pop: ["Pop", "J-Pop", "K-Pop", "Music"],
  rock: ["Rock", "Band", "Music"],
  hiphop: ["Hip-Hop", "HipHop", "Rap"],
  edm: ["EDM", "Electronic", "DJ"],
  ai: ["AI", "AI Music", "Generative"],
} as const;

export function isMusicGenreCommunityCategory(category: string | undefined): boolean {
  const c = (category ?? "").trim();
  if (!c) return false;
  for (const terms of Object.values(GENRE_TO_CATEGORY)) {
    for (const t of terms) {
      if (t === "Music" && c === "Music") continue;
      if (c.includes(t)) return true;
    }
  }
  return false;
}
