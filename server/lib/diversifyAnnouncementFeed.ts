/**
 * Limits how many items from the same community appear in one page of the
 * cross-community announcements feed (reduces "one venue hogs the carousel" UX).
 */
export function diversifyAnnouncementRowsByCommunity<
  T extends { communityId: number; pinned: boolean | null },
>(rows: T[], limit: number, maxPerCommunity: number): T[] {
  const pinned = rows.filter((r) => !!r.pinned);
  const pool = rows.filter((r) => !r.pinned);
  const out: T[] = [];
  const count = new Map<number, number>();
  const bump = (id: number) => count.set(id, (count.get(id) ?? 0) + 1);
  const underCap = (id: number) => (count.get(id) ?? 0) < maxPerCommunity;

  for (const r of pinned) {
    if (out.length >= limit) break;
    out.push(r);
    bump(r.communityId);
  }

  while (out.length < limit && pool.length > 0) {
    let idx = pool.findIndex((r) => underCap(r.communityId));
    if (idx < 0) idx = 0;
    const [next] = pool.splice(idx, 1);
    out.push(next);
    bump(next.communityId);
  }
  return out;
}
