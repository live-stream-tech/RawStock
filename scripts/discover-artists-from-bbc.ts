import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

type DiscoveredArtist = {
  name: string;
  aliases: string[];
  genres: string[];
  sources: string[];
};

const BBC_FEEDS = [
  "https://podcasts.files.bbci.co.uk/p02nrtyg.rss",
  "https://www.bbc.co.uk/programmes/p02nrtyg/episodes/player.xml",
];

const GENRE_PATTERNS: Array<{ genre: string; re: RegExp }> = [
  { genre: "reggae", re: /\b(reggae|dub|dancehall|roots|sound\s*system)\b/i },
  { genre: "edm", re: /\b(essential mix|techno|house|dnb|drum\s*&\s*bass|jungle|club)\b/i },
  { genre: "hiphop", re: /\b(hip[\s-]?hop|rap|trap|grime)\b/i },
];

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html: string): string {
  return decodeXml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractFirst(regex: RegExp, text: string): string | null {
  const m = text.match(regex);
  return m?.[1]?.trim() ?? null;
}

function normalizeName(name: string): string {
  return name
    .replace(/\s*\((?:essential mix|live|radio.*?|bbc.*?)\)\s*$/i, "")
    .replace(/\s*[-|:]\s*(?:essential mix|live|bbc.*)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseArtistName(title: string): string | null {
  const t = stripTags(title);
  const candidates: Array<string | null> = [
    extractFirst(/^(.+?)['’]s\b/i, t),
    extractFirst(/^(.+?)\s*[:\-|]\s*Essential Mix\b/i, t),
    extractFirst(/\bEssential Mix\b\s*[:\-|]\s*(.+)$/i, t),
    extractFirst(/^(.+?)\s*[:\-|]\s*BBC Radio\b/i, t),
    extractFirst(/^(.+?)\s+Mini Mix\b/i, t),
  ];
  const first = candidates.find((c) => c && c.trim().length >= 2);
  if (!first) return null;
  const normalized = normalizeName(first);
  if (!normalized || /\b(essential mix|bbc|radio 1)\b/i.test(normalized)) return null;
  return normalized;
}

function inferGenres(blob: string): string[] {
  const out = new Set<string>();
  for (const g of GENRE_PATTERNS) {
    if (g.re.test(blob)) out.add(g.genre);
  }
  if (!out.size) out.add("edm");
  return [...out];
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "RawStockArtistDiscovery/1.0 (+https://rawstock.uk)" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseRssItems(xml: string): Array<{ title: string; description: string }> {
  const out: Array<{ title: string; description: string }> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = extractFirst(/<title>([\s\S]*?)<\/title>/i, block) ?? "";
    const description = extractFirst(/<description>([\s\S]*?)<\/description>/i, block) ?? "";
    if (!title.trim()) continue;
    out.push({ title: stripTags(title), description: stripTags(description) });
  }
  return out;
}

async function main() {
  const artistMap = new Map<string, DiscoveredArtist>();
  for (const feedUrl of BBC_FEEDS) {
    try {
      const xml = await fetchText(feedUrl);
      const items = parseRssItems(xml);
      for (const it of items) {
        const name = parseArtistName(it.title);
        if (!name) continue;
        const key = name.toLowerCase();
        const blob = `${it.title} ${it.description}`;
        const genres = inferGenres(blob);
        const row = artistMap.get(key) ?? {
          name,
          aliases: [key],
          genres: [],
          sources: [],
        };
        row.genres = [...new Set([...row.genres, ...genres])];
        row.sources = [...new Set([...row.sources, feedUrl])];
        artistMap.set(key, row);
      }
      console.log(`[bbc] parsed ${items.length} items from ${feedUrl}`);
    } catch (e) {
      console.warn(`[bbc] failed ${feedUrl}:`, e instanceof Error ? e.message : e);
    }
  }

  const artists = [...artistMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const output = {
    generatedAt: new Date().toISOString(),
    source: "bbc-artist-discovery",
    artists,
  };
  const outPath = path.join(process.cwd(), "scripts", "artist-discovery-cache.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`[bbc] wrote ${artists.length} artists to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
