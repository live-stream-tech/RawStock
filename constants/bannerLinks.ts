/** Served from Expo web `public/` (source ratio 1240×216). */
export const TEMP_BANNER_IMAGE_PATH = "/promo-audio-gear-banner.png";

/** Width / height of `TEMP_BANNER_IMAGE_PATH` for layout boxes. */
export const TEMP_BANNER_ASPECT = 1240 / 216;

export const DEFAULT_BANNER_COMMUNITY_ID = 1;

export function getBannerTargetRoute(communityId?: number | null): string {
  const id =
    typeof communityId === "number" && Number.isFinite(communityId) && communityId > 0
      ? communityId
      : DEFAULT_BANNER_COMMUNITY_ID;
  return `/advertise?communityId=${id}`;
}
