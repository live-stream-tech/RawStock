export type AnnouncementFieldCheck = {
  eventDate: string | null;
  venue: string | null;
  hasLineup: boolean;
  hasTicketInfo: boolean;
  pass: boolean;
  reasons: string[];
};

const MONTH_DATE_RE =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b/i;
const NUMERIC_DATE_RE = /\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/;
const LINEUP_RE = /\b(lineup|line-?up|feat\.?|featuring|b2b|support(?:ed)?\s+by|w\/|with)\b/i;
const TICKET_RE = /\b(ticket|tickets|entry|admission|door|rsvp|guestlist|presale|on\s+sale|buy\s+now)\b/i;
const VENUE_HINT_RE = /\b(at|venue|club|hall|warehouse|arena|stadium)\b/i;
const ARTIST_HINT_RE = /\b(dj|mc|live\s+set|band|orchestra|collective|crew|soundsystem)\b/i;

export function normalizeTitleForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEventDate(blob: string, fallbackPubDate?: string | null): string | null {
  const month = blob.match(MONTH_DATE_RE)?.[0] ?? null;
  if (month) return month;
  const numeric = blob.match(NUMERIC_DATE_RE)?.[0] ?? null;
  if (numeric) return numeric;
  if (fallbackPubDate && fallbackPubDate.trim()) return fallbackPubDate.trim().slice(0, 10);
  return null;
}

export function evaluateAnnouncementFields(args: {
  title: string;
  blurb: string;
  link: string;
  pubDate?: string | null;
  venueHint?: string | null;
}): AnnouncementFieldCheck {
  const blob = `${args.title} ${args.blurb}`.replace(/\s+/g, " ").trim();
  const eventDate = extractEventDate(blob, args.pubDate ?? null);
  const hasLineup = LINEUP_RE.test(blob);
  const hasArtistHint = ARTIST_HINT_RE.test(blob);
  const hasTicketInfo = TICKET_RE.test(blob) || TICKET_RE.test(args.link);
  const venue =
    (args.venueHint && args.venueHint.trim()) ||
    (VENUE_HINT_RE.test(blob) ? "mentioned" : null);

  const reasons: string[] = [];
  if (!eventDate) reasons.push("missing_event_date");
  if (!venue) reasons.push("missing_venue");
  if (!hasLineup && !hasArtistHint) reasons.push("missing_lineup_or_artist");
  if (!hasTicketInfo) reasons.push("missing_ticket_info");
  return {
    eventDate,
    venue,
    hasLineup: hasLineup || hasArtistHint,
    hasTicketInfo,
    pass: reasons.length === 0,
    reasons,
  };
}

export function buildAnnouncementDedupKey(input: {
  eventDate: string;
  venue: string;
  title: string;
}): string {
  return `${input.eventDate.toLowerCase()}|${input.venue.toLowerCase()}|${normalizeTitleForDedup(input.title)}`;
}
