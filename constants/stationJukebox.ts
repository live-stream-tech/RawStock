/** Fixed communityId values reserved for station-level Jukebox rooms.
 *  These are not real communities — they exist only as Jukebox rooms
 *  and are outside the normal community ID range. */
export const STATION_JUKEBOX_IDS: Record<string, number> = {
  music:             9001,
  ai_video:          9002,
  idol_influencer:   9003,
  entertainment:     9004,
};
