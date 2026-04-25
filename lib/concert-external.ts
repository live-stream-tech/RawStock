/**
 * Optional Expo `EXPO_PUBLIC_*` URLs to host concert signup / staff flows off-app.
 * When unset, the in-app API routes are used.
 */
export function concertCreateExternalUrl(): string {
  return (process.env.EXPO_PUBLIC_CONCERT_CREATE_URL ?? "").trim();
}

export function concertStaffApplyExternalUrl(): string {
  return (process.env.EXPO_PUBLIC_CONCERT_STAFF_APPLY_URL ?? "").trim();
}

export function concertStaffManageExternalUrl(): string {
  return (process.env.EXPO_PUBLIC_CONCERT_STAFF_MANAGE_URL ?? "").trim();
}

/** Append `concertId` to an external form URL (merges with existing query string). */
export function withConcertIdParam(base: string, concertId: number): string {
  const id = String(concertId);
  try {
    const u = new URL(base);
    u.searchParams.set("concertId", id);
    return u.toString();
  } catch {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}concertId=${encodeURIComponent(id)}`;
  }
}
