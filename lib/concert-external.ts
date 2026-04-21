/**
 * Concert の登録・スタッフ申請・承認をアプリ外に寄せる場合に設定する（Expo の EXPO_PUBLIC_*）。
 * 未設定のときは従来どおりアプリ内 API を使う。
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

/** 外部フォームにコンサート ID を付与（既に query がある場合は concertId を追加） */
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
