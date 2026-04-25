export type AnnouncementSource = {
  key: string;
  label: string;
  city: string;
  timezone: string;
  officialCalendarUrl: string;
  rssUrl: string | null;
  icsUrl: string | null;
  snsAccount: string | null;
  venueName: string | null;
  sourcePriority: 1 | 2 | 3; // 1: venue official, 2: trusted aggregator, 3: scene media
};

import { OFFICIAL_VENUE_REGISTRY } from "./venue-registry";

const BASE_SOURCES: AnnouncementSource[] = OFFICIAL_VENUE_REGISTRY.map((v) => ({
  key: v.key,
  label: v.label,
  city: v.city,
  timezone: v.timezone,
  officialCalendarUrl: v.officialCalendarUrl,
  rssUrl: v.rssUrl,
  icsUrl: v.icsUrl,
  snsAccount: v.snsAccount,
  venueName: v.venueName,
  sourcePriority: 1 as const,
}));

export const OFFICIAL_ANNOUNCEMENT_SOURCES_V3 = BASE_SOURCES.filter(
  (s) => s.sourcePriority === 1,
);
export const OFFICIAL_ANNOUNCEMENT_SOURCES_ROUTE_B = BASE_SOURCES.filter(
  () => false,
);
