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
import { registerUnauthenticatedRedirect, requestLoginRedirect } from "@/lib/session-redirect";
import { GlobalMyListPlayer } from "@/components/GlobalMyListPlayer";
import { GlobalJukeboxPlayer } from "@/components/GlobalJukeboxPlayer";
import { PlayingVideoProvider } from "@/lib/playing-video-context";
import { installWebAlertFallback } from "@/lib/alertCompat";
import { setCurrentClientRoute } from "@/lib/clientErrorContext";
import { WebVercelAnalytics } from "@/components/WebVercelAnalytics";

SplashScreen.preventAutoHideAsync();
installWebAlertFallback();

if (Platform.OS === "web" && typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
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

function normalizeWebUiLanguage(raw: string | null | undefined): "ja" | "en" {
  return (raw ?? "").toLowerCase().startsWith("ja") ? "ja" : "en";
}

function WebUiLanguageBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const browserLang =
      typeof navigator !== "undefined" ? normalizeWebUiLanguage(navigator.language) : "en";
    const nextLang = user?.preferredLanguage ? normalizeWebUiLanguage(user.preferredLanguage) : browserLang;
    const root = document.documentElement;
    root.lang = nextLang;
    root.dataset.uiLang = nextLang;
    if (document.body) {
      document.body.dataset.uiLang = nextLang;
    }
  }, [user?.preferredLanguage]);

  return null;
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

  const exact = new Set([
    "/",
    "/stations",
    "/profile",
    "/community",
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
  if (/^\/station\/[^/]+$/.test(pathname)) return true;

  if (/^\/user\/\d+$/.test(pathname)) return true;
  if (/^\/user\/\d+\/(followers|following)$/.test(pathname)) return true;

  if (/^\/video\/\d+$/.test(pathname)) return true;

  if (/^\/livers\/\d+$/.test(pathname)) return true;

  if (/^\/concert\/\d+$/.test(pathname)) return true;

  return false;
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
    registerUnauthenticatedRedirect(() => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const full = window.location.pathname + window.location.search;
        saveLoginReturn(full);
      }
      router.replace("/auth/login");
    });
  }, []);

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
    requestLoginRedirect();
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
  const isWideWebRoute =
    Platform.OS === "web" && (pathname.startsWith("/jukebox") || pathname === "/advertise");
  if (Platform.OS !== "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  return (
    <View
      style={
        isWideWebRoute
          ? { flex: 1, width: "100%", maxWidth: 1400, alignSelf: "center", minHeight: 0 }
          : { flex: 1, maxWidth: 500, alignSelf: "center", width: "100%", minHeight: 0 }
      }
    >
      {children}
    </View>
  );
}

function ClientErrorRouteTracker() {
  const pathname = usePathname() ?? "";
  useEffect(() => {
    setCurrentClientRoute(pathname || null);
  }, [pathname]);
  return null;
}

const stackScreenOptions =
  Platform.OS === "web"
    ? { headerShown: false, animation: "none" as const, freezeOnBlur: true }
    : { headerShown: false };

function RootLayoutNav() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="advertise" options={{ headerShown: false }} />
      <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/members/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="livers/index" options={{ headerShown: false }} />
      <Stack.Screen name="livers/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="community/ad-apply" options={{ headerShown: false }} />
      <Stack.Screen name="community/ad-review" options={{ headerShown: false }} />
      <Stack.Screen name="station/[stationId]" options={{ headerShown: false }} />
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
          <WebUiLanguageBridge />
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
            <WebRootWidth>
            <KeyboardProvider>
              <TokenHandler>
                <GlobalAuthGate>
                  <DemoModeProvider>
                    <PlayingVideoProvider>
                      <View style={{ flex: 1, ...(Platform.OS === "web" ? { minHeight: 0 } : {}) }}>
                        <ClientErrorRouteTracker />
                        <EventPreviewBanner />
                        <PolicyReacceptanceBanner />
                        <RootLayoutNav />
                        <GlobalMyListPlayer />
                        <GlobalJukeboxPlayer />
                        <WebVercelAnalytics />
                      </View>
                    </PlayingVideoProvider>
                  </DemoModeProvider>
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
