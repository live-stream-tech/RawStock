/**
 * Structured announcement lines (seed / composer use "Label: value") + URL splitting for tappable links.
 */

export type AnnouncementField = {
  /** Stable key for ordering (city, venue, … or custom_*) */
  key: string;
  label: string;
  value: string;
};

const KNOWN: { key: string; label: string; re: RegExp }[] = [
  { key: "date", label: "Date", re: /^Date\s*:\s*(.*)$/i },
  { key: "city", label: "City", re: /^City\s*:\s*(.*)$/i },
  { key: "venue", label: "Venue", re: /^Venue\s*:\s*(.*)$/i },
  { key: "lineup", label: "Lineup", re: /^Lineup\s*:\s*(.*)$/i },
  { key: "tickets", label: "Tickets", re: /^Tickets\s*:\s*(.*)$/i },
  { key: "info", label: "Info", re: /^Info\s*:\s*(.*)$/i },
];

const DISPLAY_ORDER = ["date", "city", "venue", "lineup", "tickets", "info"];

/** Strip common trailing punctuation from URL matches. */
function trimUrlEnd(u: string): string {
  return u.replace(/[),.;:!?>\]}'"」』]+$/, "");
}

/**
 * Split plain text into alternating text / URL segments for nested <Text> link styling.
 */
export function splitTextWithUrls(text: string): { kind: "text" | "url"; value: string }[] {
  const s = String(text ?? "");
  if (!s) return [];
  const re = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const out: { kind: "text" | "url"; value: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", value: s.slice(last, m.index) });
    }
    out.push({ kind: "url", value: trimUrlEnd(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    out.push({ kind: "text", value: s.slice(last) });
  }
  return out.length > 0 ? out : [{ kind: "text", value: s }];
}

function upsertKnownField(fields: AnnouncementField[], def: (typeof KNOWN)[number], value: string) {
  const v = value.trim();
  const idx = fields.findIndex((f) => f.key === def.key);
  const row: AnnouncementField = { key: def.key, label: def.label, value: v };
  if (idx >= 0) fields[idx] = row;
  else fields.push(row);
}

/**
 * Pulls "Label: value" rows into fields; everything else is prose lines (preserves order).
 */
export function parseAnnouncementStructuredLines(text: string): {
  fields: AnnouncementField[];
  proseLines: string[];
} {
  const raw = String(text ?? "").trim();
  if (!raw) return { fields: [], proseLines: [] };
  const fields: AnnouncementField[] = [];
  const proseLines: string[] = [];
  let customIdx = 0;

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let hit = false;
    for (const k of KNOWN) {
      const m = t.match(k.re);
      if (m) {
        upsertKnownField(fields, k, m[1] ?? "");
        hit = true;
        break;
      }
    }
    if (hit) continue;

    const generic = t.match(/^([^:\n]{1,48}):\s*(.+)$/);
    if (generic && !/^https?:\/\//i.test(generic[1].trim())) {
      const label = generic[1].trim();
      const value = generic[2].trim();
      if (label.length >= 1 && value.length >= 1) {
        fields.push({ key: `custom_${customIdx++}`, label, value });
        continue;
      }
    }
    proseLines.push(t);
  }

  return { fields, proseLines };
}

export function sortAnnouncementFields(fields: AnnouncementField[]): AnnouncementField[] {
  const knownOrder = new Map(DISPLAY_ORDER.map((k, i) => [k, i]));
  const known = fields.filter((f) => knownOrder.has(f.key)).sort((a, b) => knownOrder.get(a.key)! - knownOrder.get(b.key)!);
  const unknown = fields.filter((f) => !knownOrder.has(f.key));
  return [...known, ...unknown];
}
