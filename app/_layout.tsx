import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PolicyReacceptanceBanner } from "@/components/PolicyReacceptanceBanner";
import { queryClient } from "@/lib/query-client";
import { DemoModeProvider } from "@/lib/demo-mode";
import { AuthProvider, useAuth } from "@/lib/auth";
import { consumeLoginRedirectPath, saveLoginReturn } from "@/lib/login-return";
import { GlobalMyListPlayer } from "@/components/GlobalMyListPlayer";
import { GlobalJukeboxPlayer } from "@/components/GlobalJukeboxPlayer";
import { PlayingVideoProvider } from "@/lib/playing-video-context";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === "web" && typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/** Detect auth token in web URL to avoid first-render flash. */
function useHasTokenInUrl(): boolean {
  const [hasToken] = useState(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    // /auth/callback?token=xxx
    if (window.location.pathname === "/auth/callback" && new URLSearchParams(window.location.search).get("token")) return true;
    // /?token=xxx (including iOS Safari PWA flow)
    if (window.location.pathname === "/" && new URLSearchParams(window.location.search).get("token")) return true;
    return false;
  });
  return hasToken;
}

/**
 * Auth token handler.
 * - /?token=xxx: process token directly at root route.
 */
function TokenHandler({ children }: { children: React.ReactNode }) {
  const { loginWithToken } = useAuth();

  // Web /?token=xxx pattern (including iOS Safari PWA).
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token || window.location.pathname !== "/") return;
    // Remove token from URL before login handling.
    const newUrl = window.location.pathname;
    window.history.replaceState({}, "", newUrl);
    loginWithToken(token)
      .then(() => router.replace(consumeLoginRedirectPath() as any))
      .catch(() => router.replace("/auth/login?auth_error=me_failed"));
  }, [loginWithToken]);

  return <>{children}</>;
}

/** Normalize Expo Router pathnames for matching (web + native). */
function normalizePathname(raw: string): string {
  if (!raw) return "/";
  let p = raw.split("?")[0] ?? "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p.startsWith("/(tabs)")) {
    p = p.slice("/(tabs)".length) || "/";
  }
  return p || "/";
}

/**
 * Routes guests may open without signing in (browse / legal / auth).
 * Everything else redirects to /auth/login via GlobalAuthGate.
 */
function isPublicPath(rawPathname: string): boolean {
  const pathname = normalizePathname(rawPathname);
  /** DM is never guest-readable — force sign-in even if pathname normalization changes. */
  if (pathname === "/dm" || pathname.startsWith("/dm/")) return false;
  if (pathname === "/" || pathname === "") return true;

  const exact = new Set([
    "/community",
    "/stations",
    "/auth/login",
    "/auth/register",
    "/auth/callback",
    "/auth/popup-fallback",
    "/privacy",
    "/terms",
    "/legal",
    "/legal-notice",
    "/dmca",
    "/tokusho",
    "/community-guidelines",
    "/lp",
    "/teamz",
    "/livers",
    "/livers/index",
    "/find-editor",
    "/editors",
    "/announcements",
    "/live-announcements",
    "/mentor-sessions",
    "/+not-found",
  ]);
  if (exact.has(pathname)) return true;
  if (pathname.startsWith("/rawstock-lp")) return true;

  if (/^\/community\/\d+$/.test(pathname)) return true;
  if (/^\/community\/members\/\d+$/.test(pathname)) return true;
  if (/^\/community\/genre\/[^/]+$/.test(pathname)) return true;

  if (/^\/user\/\d+$/.test(pathname)) return true;
  if (/^\/user\/\d+\/(followers|following)$/.test(pathname)) return true;

  if (/^\/video\/\d+$/.test(pathname)) return true;

  if (/^\/livers\/\d+$/.test(pathname)) return true;

  if (/^\/concert\/\d+$/.test(pathname)) return true;

  return false;
}

/** Require profile setup on first login. */
const PROFILE_SETUP_REQUIRED_NAMES = ["Google User", "User"];
function needsProfileSetup(displayName: string | undefined): boolean {
  const name = (displayName ?? "").trim();
  return !name || PROFILE_SETUP_REQUIRED_NAMES.includes(name);
}

function ProfileSetupGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;
    const authPath =
      pathname === "/auth/login" ||
      pathname === "/auth/register" ||
      pathname === "/auth/callback" ||
      pathname === "/auth/popup-fallback";
    if (pathname === "/account" || authPath) return;
    if (needsProfileSetup(user.displayName ?? user.name)) {
      router.replace("/account");
    }
  }, [user, loading, pathname]);

  return <>{children}</>;
}

/** Root-level auth guard for non-public routes. */
function EventPreviewBanner() {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return (
    <View style={{ backgroundColor: "#0A1520", paddingVertical: 4, alignItems: "center", paddingTop: Platform.OS === "web" ? 4 : 0 }}>
      <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 0.6 }}>
        EVENT PREVIEW MODE · Sign in to interact with content
      </Text>
    </View>
  );
}

function GlobalAuthGate({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth();
  const pathname = usePathname();
  const hasTokenInUrl = useHasTokenInUrl();
  // Treat as signed in if user exists or token was restored.
  const isLoggedIn = !!user || !!token;

  useEffect(() => {
    if (loading) return;
    if (hasTokenInUrl) return; // Skip redirects while OAuth callback is in progress.
    if (!pathname) return;
    if (isLoggedIn) return;
    if (isPublicPath(pathname)) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const full = window.location.pathname + window.location.search;
      saveLoginReturn(full);
    }
    router.replace("/auth/login");
  }, [user, token, loading, pathname, hasTokenInUrl, isLoggedIn]);

  // Render nothing while waiting for redirect on protected routes.
  if (!isLoggedIn && !loading && !hasTokenInUrl && pathname && !isPublicPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}

/** Web: jukebox uses full width (up to cap); other routes stay phone-width column. */
function WebRootWidth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isJukeboxRoute = Platform.OS === "web" && pathname.startsWith("/jukebox");
  if (Platform.OS !== "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  return (
    <View
      style={
        isJukeboxRoute
          ? { flex: 1, width: "100%", maxWidth: 1400, alignSelf: "center", minHeight: 0 }
          : { flex: 1, maxWidth: 500, alignSelf: "center", width: "100%", minHeight: 0 }
      }
    >
      {children}
    </View>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/members/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="livers/index" options={{ headerShown: false }} />
      <Stack.Screen name="livers/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/ad-apply" options={{ headerShown: false }} />
      <Stack.Screen name="community/ad-review" options={{ headerShown: false }} />
      <Stack.Screen name="video/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="upload" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="announcements" options={{ headerShown: false }} />
      <Stack.Screen name="jukebox/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="live/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="dm/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="mentor-booking/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="two-shot/reserve" options={{ headerShown: false }} />
      <Stack.Screen name="two-shot/success" options={{ headerShown: false }} />
      <Stack.Screen name="mentor-success" options={{ headerShown: false }} />
      <Stack.Screen name="success" options={{ headerShown: false }} />
      <Stack.Screen name="revenue" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="payout-settings" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="dmca" options={{ headerShown: false }} />
      <Stack.Screen name="community-guidelines" options={{ headerShown: false }} />
      <Stack.Screen name="legal" options={{ headerShown: false }} />
      <Stack.Screen name="tokusho" options={{ headerShown: false }} />
      <Stack.Screen name="lp" options={{ headerShown: false }} />
      <Stack.Screen name="teamz" options={{ headerShown: false }} />
      <Stack.Screen name="rawstock-lp/index" options={{ headerShown: false }} />
      <Stack.Screen name="community/genre-ad-apply" options={{ headerShown: false }} />
      <Stack.Screen name="admin/index" options={{ headerShown: false }} />
      <Stack.Screen name="admin/users" options={{ headerShown: false }} />
      <Stack.Screen name="admin/content" options={{ headerShown: false }} />
      <Stack.Screen name="admin/reports" options={{ headerShown: false }} />
      <Stack.Screen name="concert/create" options={{ headerShown: false }} />
      <Stack.Screen name="concert/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="concert/staff-request" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
            <WebRootWidth>
            <KeyboardProvider>
              <TokenHandler>
                <GlobalAuthGate>
                  <ProfileSetupGuard>
                  <DemoModeProvider>
                    <PlayingVideoProvider>
                      <View style={{ flex: 1, ...(Platform.OS === "web" ? { minHeight: 0 } : {}) }}>
                        <EventPreviewBanner />
                        <PolicyReacceptanceBanner />
                        <RootLayoutNav />
                        <GlobalMyListPlayer />
                        <GlobalJukeboxPlayer />
                      </View>
                    </PlayingVideoProvider>
                  </DemoModeProvider>
                  </ProfileSetupGuard>
                </GlobalAuthGate>
              </TokenHandler>
            </KeyboardProvider>
            </WebRootWidth>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
