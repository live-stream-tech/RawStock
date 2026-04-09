import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { saveLoginReturn } from "@/lib/login-return";
import { router } from "expo-router";
import { debugIngestLocal } from "@/lib/debugIngest";

export type User = {
  id: number;
  name: string;
  displayName?: string;
  bio: string;
  avatar: string | null;
  profileImageUrl?: string | null;
  role?: string;
  /** ISO 8601 — クリエイター払い出し条項に同意した日時 */
  payoutTermsAgreedAt?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  bandcampUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  xUrl?: string | null;
  phoneNumber?: string | null;
  pinnedCommunityIds?: number[];
  /** 直近コンテンツから推定した言語（ISO 639-1）。未検知は null */
  lastContentLang?: string | null;
  /** サーバが要求する現行条項・プライバシー版（constants/legalVersions） */
  currentTermsVersion?: string;
  currentPrivacyVersion?: string;
  termsAcceptedVersion?: string | null;
  termsAcceptedAt?: string | null;
  privacyAcceptedVersion?: string | null;
  privacyAcceptedAt?: string | null;
  needsTermsReacceptance?: boolean;
  needsPrivacyReacceptance?: boolean;
  followersCount?: number;
  followingCount?: number;
};

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<User, "name" | "bio" | "avatar" | "spotifyUrl" | "appleMusicUrl" | "bandcampUrl" | "instagramUrl" | "youtubeUrl" | "xUrl" | "phoneNumber">> & { pinnedCommunityIds?: number[] | null }) => Promise<void>;
  /** 未ログイン時にGoogleログインへ誘導する。戻り値はログイン済みなら true */
  requireAuth: (actionLabel?: string) => boolean;
  /** 現行版の Terms / Privacy に同意を記録しユーザー状態を更新 */
  acceptPolicies: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  loading: true,
  loginWithToken: async () => {},
  logout: () => {},
  updateProfile: async () => {},
  requireAuth: () => false,
  acceptPolicies: async () => {},
});

const TOKEN_KEY = "auth_token";

async function apiFetch(path: string, options?: RequestInit) {
  const base = getApiUrl();
  const url = new URL(path, base).toString();
  debugIngestLocal({
    sessionId: "88cb7d",
    runId: "initial",
    hypothesisId: "H2",
    location: "lib/auth.tsx:apiFetch",
    message: "Auth API request start",
    data: { path, url, method: options?.method ?? "GET" },
    timestamp: Date.now(),
  });
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });

  // 一部のケースでレスポンスが JSON にならないことがあるため、まずテキストとして受ける
  // （HTMLエラーページ等で `res.json()` が落ちるのを防ぐ）
  const rawText = await res.text();
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText || res.statusText };
  }

  if (!res.ok) {
    debugIngestLocal({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H3",
      location: "lib/auth.tsx:apiFetch",
      message: "Auth API request failed",
      data: { path, status: res.status, error: data?.error ?? null, code: data?.code ?? null },
      timestamp: Date.now(),
    });
    const err: Error & { status?: number; code?: unknown; body?: string } = new Error(
      data?.error ?? "エラーが発生しました",
    );
    err.status = res.status;
    err.code = data?.code;
    err.body = rawText;
    throw err;
  }
  return data;
}

function normalizeMe(me: Record<string, unknown>): User {
  return {
    id: me.id as number,
    name: (me.name ?? me.displayName ?? "User") as string,
    displayName: (me.displayName ?? me.name) as string | undefined,
    bio: (me.bio ?? "") as string,
    avatar: (me.avatar ?? me.profileImageUrl ?? null) as string | null,
    profileImageUrl: (me.profileImageUrl ?? me.avatar) as string | null | undefined,
    role: me.role as string | undefined,
    spotifyUrl: (me.spotifyUrl ?? null) as string | null,
    appleMusicUrl: (me.appleMusicUrl ?? null) as string | null,
    bandcampUrl: (me.bandcampUrl ?? null) as string | null,
    instagramUrl: (me.instagramUrl ?? null) as string | null,
    youtubeUrl: (me.youtubeUrl ?? null) as string | null,
    xUrl: (me.xUrl ?? null) as string | null,
    phoneNumber: (me.phoneNumber ?? null) as string | null,
    pinnedCommunityIds: (me.pinnedCommunityIds ?? []) as number[],
    lastContentLang: (me.lastContentLang ?? null) as string | null,
    currentTermsVersion: me.currentTermsVersion as string | undefined,
    currentPrivacyVersion: me.currentPrivacyVersion as string | undefined,
    termsAcceptedVersion: (me.termsAcceptedVersion ?? null) as string | null,
    termsAcceptedAt: (me.termsAcceptedAt ?? null) as string | null,
    privacyAcceptedVersion: (me.privacyAcceptedVersion ?? null) as string | null,
    privacyAcceptedAt: (me.privacyAcceptedAt ?? null) as string | null,
    needsTermsReacceptance: Boolean(me.needsTermsReacceptance),
    needsPrivacyReacceptance: Boolean(me.needsPrivacyReacceptance),
    payoutTermsAgreedAt: (me.payoutTermsAgreedAt ?? null) as string | null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async (t) => {
      if (t) {
        try {
          const me = await apiFetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${t}` },
          });
          setToken(t);
          setUser(normalizeMe(me));
        } catch (e: unknown) {
          // 401/403 など認証エラーのみトークンを削除。
          // ネットワークエラー・タイムアウトの場合はトークンを残してログイン状態を維持する。
          const status = (e as Error & { status?: number }).status;
          const isAuthError = status === 401 || status === 403;
          if (isAuthError) {
            await AsyncStorage.removeItem(TOKEN_KEY);
          } else {
            // ネットワークエラー時: トークンだけ保持してローディングを終わらせる。
            // GlobalAuthGate は token があれば保護ページへのリダイレクトをしない。
            setToken(t);
          }
        }
      }
      setLoading(false);
    });
  }, []);

  const loginWithToken = useCallback(async (t: string) => {
    let me = await apiFetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${t}` },
    });
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    if (Platform.OS === "web" && typeof window !== "undefined" && window.sessionStorage?.getItem("rawstock_policy_ack") === "1") {
      try {
        await apiFetch("/api/auth/accept-policies", {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
        });
        window.sessionStorage.removeItem("rawstock_policy_ack");
        me = await apiFetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${t}` },
        });
      } catch {
        window.sessionStorage.removeItem("rawstock_policy_ack");
      }
    }
    setUser(normalizeMe(me));
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    // ログアウト後は常にログイン画面へ戻す
    router.replace("/auth/login");
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<User, "name" | "bio" | "avatar" | "spotifyUrl" | "appleMusicUrl" | "bandcampUrl" | "instagramUrl" | "youtubeUrl" | "xUrl" | "phoneNumber">> & { pinnedCommunityIds?: number[] | null }) => {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    const payload: Record<string, string | null | number[]> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.avatar !== undefined) payload.avatar = data.avatar;
    if (data.spotifyUrl !== undefined) payload.spotifyUrl = data.spotifyUrl;
    if (data.appleMusicUrl !== undefined) payload.appleMusicUrl = data.appleMusicUrl;
    if (data.bandcampUrl !== undefined) payload.bandcampUrl = data.bandcampUrl;
    if (data.instagramUrl !== undefined) payload.instagramUrl = data.instagramUrl;
    if (data.youtubeUrl !== undefined) payload.youtubeUrl = data.youtubeUrl;
    if (data.xUrl !== undefined) payload.xUrl = data.xUrl;
    if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
    if (data.pinnedCommunityIds !== undefined) payload.pinnedCommunityIds = data.pinnedCommunityIds;
    debugIngestLocal({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H3",
      location: "lib/auth.tsx:updateProfile",
      message: "Submitting profile update",
      data: { payloadKeys: Object.keys(payload), hasToken: Boolean(t) },
      timestamp: Date.now(),
    });
    const updated = await apiFetch("/api/auth/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${t}` },
      body: JSON.stringify(payload),
    });
    setUser(normalizeMe(updated));
  }, []);

  const requireAuth = useCallback(
    (actionLabel?: string): boolean => {
      if (!user) {
        Alert.alert(
          "Sign In Required",
          actionLabel ? `Sign in to ${actionLabel}.` : "Sign in to continue.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign In",
              onPress: () => {
                if (Platform.OS === "web" && typeof window !== "undefined") {
                  const returnTo = window.location.pathname + window.location.search;
                  saveLoginReturn(returnTo);
                  window.location.href = new URL("/api/auth/google", getApiUrl()).toString();
                } else {
                  router.push("/auth/login" as any);
                }
              },
            },
          ]
        );
        return false;
      }
      return true;
    },
    [user]
  );

  const acceptPolicies = useCallback(async () => {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    if (!t) return;
    await apiFetch("/api/auth/accept-policies", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
    });
    const me = await apiFetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${t}` },
    });
    setUser(normalizeMe(me));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginWithToken, logout, updateProfile, requireAuth, acceptPolicies }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** URL に token があるか（OAuthコールバック処理中はログインへ飛ばさない） */
function hasTokenInUrl(): boolean {
  if (typeof window === "undefined") return false;
  return !!new URLSearchParams(window.location.search).get("token");
}

/** ログイン必須画面で未ログインならGoogleログインへリダイレクトするガード */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (hasTokenInUrl()) return; // コールバック処理中はリダイレクトしない
    if (!user) {
      if (typeof window !== "undefined") {
        const returnTo = window.location.pathname + window.location.search;
        saveLoginReturn(returnTo);
      }
      router.replace("/auth/login");
    }
  }, [user, loading]);

  if (loading || !user) {
    return null;
  }
  return <>{children}</>;
}
