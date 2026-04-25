import { db } from "../db";
import { communities } from "../schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type CommunityRow = InferSelectModel<typeof communities>;

/** Columns guaranteed on the oldest migrations (DBs missing icon_url / is_official, etc.). */
function mapLegacyCommunityRow(r: Record<string, unknown>): CommunityRow {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    members: Number(r.members ?? 0),
    thumbnail: String(r.thumbnail ?? ""),
    iconUrl: null,
    online: Boolean(r.online),
    category: String(r.category ?? ""),
    adminId: r.admin_id != null ? Number(r.admin_id) : null,
    ownerId: r.owner_id != null ? Number(r.owner_id) : null,
    isOfficial: false,
    revenueDistribution: null,
  };
}

function isMissingColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /column .* does not exist/i.test(msg);
}

/**
 * Ordered community list (official hubs first). Falls back to a legacy SELECT if newer columns are missing.
 */
export async function fetchCommunitiesListOrdered(): Promise<CommunityRow[]> {
  try {
    return await db
      .select()
      .from(communities)
      .orderBy(desc(communities.isOfficial), desc(communities.members));
  } catch (e: unknown) {
    if (!isMissingColumnError(e)) throw e;
    const r = await db.execute(sql`
      SELECT id, name, members, thumbnail, online, category, admin_id, owner_id
      FROM communities
      ORDER BY members DESC
    `);
    return (r.rows as Record<string, unknown>[]).map(mapLegacyCommunityRow);
  }
}

/**
 * Communities the user joined (official first). Falls back to members-only ordering if columns are missing.
 */
export async function fetchCommunitiesForIds(ids: number[]): Promise<CommunityRow[]> {
  if (ids.length === 0) return [];
  try {
    return await db
      .select()
      .from(communities)
      .where(inArray(communities.id, ids))
      .orderBy(desc(communities.isOfficial), desc(communities.members));
  } catch (e: unknown) {
    if (!isMissingColumnError(e)) throw e;
    const idList = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
    if (idList.length === 0) return [];
    const r = await db.execute(
      sql.raw(
        `SELECT id, name, members, thumbnail, online, category, admin_id, owner_id FROM communities WHERE id IN (${idList.join(
          ",",
        )}) ORDER BY members DESC`,
      ),
    );
    return (r.rows as Record<string, unknown>[]).map(mapLegacyCommunityRow);
  }
}

/** 単体取得（詳細 API 用） */
export async function fetchCommunityById(id: number): Promise<CommunityRow | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const [row] = await db.select().from(communities).where(eq(communities.id, id));
    return row ?? null;
  } catch (e: unknown) {
    if (!isMissingColumnError(e)) throw e;
    const r = await db.execute(sql`
      SELECT id, name, members, thumbnail, online, category, admin_id, owner_id
      FROM communities
      WHERE id = ${id}
      LIMIT 1
    `);
    const row = (r.rows as Record<string, unknown>[])[0];
    return row ? mapLegacyCommunityRow(row) : null;
  }
}
