import fs from "node:fs";
import path from "node:path";

export type VenueDictionaryEntry = {
  canonicalName: string;
  aliases: string[];
  city: string;
  timezone: string;
  genreHints: string[];
};

export type ArtistDictionaryEntry = {
  canonicalName: string;
  aliases: string[];
  genres: string[];
};

type DiscoveredArtistEntry = {
  name: string;
  aliases?: string[];
  genres?: string[];
};

export const VENUE_DICTIONARY: VenueDictionaryEntry[] = [
  {
    canonicalName: "WOMB",
    aliases: ["womb", "womb tokyo"],
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    genreHints: ["edm", "techno", "house"],
  },
  {
    canonicalName: "Contact",
    aliases: ["contact tokyo", "contact"],
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    genreHints: ["techno", "house"],
  },
  {
    canonicalName: "fabric",
    aliases: ["fabric", "fabric london"],
    city: "London",
    timezone: "Europe/London",
    genreHints: ["edm", "dnb", "house"],
  },
  {
    canonicalName: "Tresor",
    aliases: ["tresor", "tresor berlin"],
    city: "Berlin",
    timezone: "Europe/Berlin",
    genreHints: ["techno", "edm"],
  },
  {
    canonicalName: "Watergate",
    aliases: ["watergate", "watergate berlin"],
    city: "Berlin",
    timezone: "Europe/Berlin",
    genreHints: ["house", "techno", "edm"],
  },
  {
    canonicalName: "LIQUIDROOM",
    aliases: ["liquidroom", "liquid room"],
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    genreHints: ["rock", "indie", "edm"],
  },
  {
    canonicalName: "Spotify O-EAST",
    aliases: ["o-east", "spotify o-east", "shibuya o-east"],
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    genreHints: ["rock", "indie", "hiphop", "edm"],
  },
  {
    canonicalName: "Zepp",
    aliases: ["zepp", "zepp namba", "zepp shinjuku"],
    city: "Japan",
    timezone: "Asia/Tokyo",
    genreHints: ["rock", "pop", "hiphop", "edm"],
  },
  {
    canonicalName: "Roundhouse",
    aliases: ["roundhouse london", "roundhouse"],
    city: "London",
    timezone: "Europe/London",
    genreHints: ["rock", "electronic", "reggae"],
  },
  {
    canonicalName: "Berghain",
    aliases: ["berghain"],
    city: "Berlin",
    timezone: "Europe/Berlin",
    genreHints: ["techno", "edm"],
  },
  {
    canonicalName: "Knockdown Center",
    aliases: ["knockdown center", "knockdown"],
    city: "New York",
    timezone: "America/New_York",
    genreHints: ["edm", "experimental", "hiphop"],
  },
  {
    canonicalName: "Tuff Gong Studios",
    aliases: ["tuff gong", "tuff gong studios"],
    city: "Kingston",
    timezone: "America/Jamaica",
    genreHints: ["reggae", "dub", "dancehall"],
  },
  {
    canonicalName: "Reggae Sumfest",
    aliases: ["reggae sumfest", "sumfest"],
    city: "Montego Bay",
    timezone: "America/Jamaica",
    genreHints: ["reggae", "dancehall", "dub"],
  },
  {
    canonicalName: "Awakenings",
    aliases: ["awakenings", "awakenings festival"],
    city: "Amsterdam",
    timezone: "Europe/Amsterdam",
    genreHints: ["techno", "edm", "rave"],
  },
  {
    canonicalName: "DGTL Amsterdam",
    aliases: ["dgtl", "dgtl amsterdam"],
    city: "Amsterdam",
    timezone: "Europe/Amsterdam",
    genreHints: ["techno", "house", "edm", "rave"],
  },
  {
    canonicalName: "Shelter Amsterdam",
    aliases: ["shelter amsterdam", "shelter"],
    city: "Amsterdam",
    timezone: "Europe/Amsterdam",
    genreHints: ["techno", "house", "edm"],
  },
  {
    canonicalName: "MDLBEAST",
    aliases: ["mdlbeast", "soundstorm"],
    city: "Riyadh",
    timezone: "Asia/Riyadh",
    genreHints: ["edm", "techno", "house", "rave"],
  },
  {
    canonicalName: "Sandbox Festival",
    aliases: ["sandbox festival", "sandbox egypt"],
    city: "Cairo",
    timezone: "Africa/Cairo",
    genreHints: ["edm", "house", "techno", "rave"],
  },
  {
    canonicalName: "Full Moon Party",
    aliases: ["full moon party", "haad rin full moon", "fullmoon party"],
    city: "Koh Phangan",
    timezone: "Asia/Bangkok",
    genreHints: ["edm", "house", "techno", "rave"],
  },
  {
    canonicalName: "Halfmoon Festival",
    aliases: ["halfmoon festival", "half moon festival", "halfmoon"],
    city: "Koh Phangan",
    timezone: "Asia/Bangkok",
    genreHints: ["edm", "house", "psytrance", "rave"],
  },
  {
    canonicalName: "Jungle Experience",
    aliases: ["jungle experience", "koh phangan jungle experience"],
    city: "Koh Phangan",
    timezone: "Asia/Bangkok",
    genreHints: ["techno", "house", "edm", "rave"],
  },
  {
    canonicalName: "S2O Festival",
    aliases: ["s2o", "s2o festival", "songkran music festival"],
    city: "Bangkok",
    timezone: "Asia/Bangkok",
    genreHints: ["edm", "house", "trance", "rave"],
  },
];

export const ARTIST_DICTIONARY: ArtistDictionaryEntry[] = [
  { canonicalName: "Skream", aliases: ["skream"], genres: ["reggae", "dub", "edm"] },
  { canonicalName: "Mala", aliases: ["mala"], genres: ["reggae", "dub"] },
  { canonicalName: "Chase & Status", aliases: ["chase and status", "chase & status"], genres: ["edm"] },
  { canonicalName: "Four Tet", aliases: ["four tet"], genres: ["edm", "indie"] },
  { canonicalName: "Ben UFO", aliases: ["ben ufo"], genres: ["edm"] },
  { canonicalName: "Skrillex", aliases: ["skrillex"], genres: ["edm"] },
  { canonicalName: "Shy FX", aliases: ["shy fx"], genres: ["edm"] },
  { canonicalName: "Jah Shaka", aliases: ["jah shaka"], genres: ["reggae"] },
  { canonicalName: "Damian Marley", aliases: ["damian marley", "jr gong"], genres: ["reggae"] },
  { canonicalName: "The Bug", aliases: ["the bug"], genres: ["reggae", "dub"] },
  { canonicalName: "Aphex Twin", aliases: ["aphex twin"], genres: ["edm"] },
  { canonicalName: "Burial", aliases: ["burial"], genres: ["edm"] },
  { canonicalName: "Kendrick Lamar", aliases: ["kendrick lamar"], genres: ["hiphop"] },
  { canonicalName: "Nas", aliases: ["nas"], genres: ["hiphop"] },
  { canonicalName: "Chronixx", aliases: ["chronixx"], genres: ["reggae", "dub"] },
  { canonicalName: "Protoje", aliases: ["protoje"], genres: ["reggae", "dub"] },
  { canonicalName: "Koffee", aliases: ["koffee"], genres: ["reggae", "dancehall"] },
  { canonicalName: "Popcaan", aliases: ["popcaan"], genres: ["dancehall", "reggae"] },
  { canonicalName: "Buju Banton", aliases: ["buju banton"], genres: ["reggae", "dancehall"] },
  { canonicalName: "Capleton", aliases: ["capleton"], genres: ["reggae", "dancehall"] },
  { canonicalName: "Sizzla", aliases: ["sizzla", "sizzla kalonji"], genres: ["reggae", "dancehall"] },
  { canonicalName: "Alborosie", aliases: ["alborosie"], genres: ["reggae", "dub"] },
  { canonicalName: "Lee Scratch Perry", aliases: ["lee scratch perry", "scratch perry"], genres: ["dub", "reggae"] },
];

function loadDiscoveredArtists(): ArtistDictionaryEntry[] {
  try {
    const p = path.join(process.cwd(), "scripts", "artist-discovery-cache.json");
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as { artists?: DiscoveredArtistEntry[] };
    const artists = Array.isArray(parsed?.artists) ? parsed.artists : [];
    return artists
      .map((a) => {
        const name = String(a.name ?? "").trim();
        if (!name) return null;
        const aliases = [name.toLowerCase(), ...(a.aliases ?? []).map((x) => String(x).toLowerCase())];
        const genres = (a.genres ?? []).map((g) => String(g).toLowerCase()).filter(Boolean);
        return {
          canonicalName: name,
          aliases: [...new Set(aliases)],
          genres: genres.length ? [...new Set(genres)] : ["edm"],
        };
      })
      .filter((x): x is ArtistDictionaryEntry => Boolean(x));
  } catch {
    return [];
  }
}

const DISCOVERED_ARTISTS = loadDiscoveredArtists();

export function findVenueHints(text: string): string[] {
  const blob = text.toLowerCase();
  const out: string[] = [];
  for (const v of VENUE_DICTIONARY) {
    if (v.aliases.some((a) => blob.includes(a))) {
      out.push(v.canonicalName);
    }
  }
  return out;
}

export function findArtistGenres(text: string): string[] {
  const blob = text.toLowerCase();
  const out = new Set<string>();
  for (const a of [...ARTIST_DICTIONARY, ...DISCOVERED_ARTISTS]) {
    if (a.aliases.some((x) => blob.includes(x))) {
      for (const g of a.genres) out.add(g);
    }
  }
  return [...out];
}
