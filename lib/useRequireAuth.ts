import { useEffect } from "react";
import { router } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "./auth";
import { saveLoginReturn } from "./login-return";

/** Redirects to `/auth/login` when there is no session. Returns null UI while redirecting. */
export function useRequireAuth(): {
  user: ReturnType<typeof useAuth>["user"];
  loading: boolean;
  isLoggedIn: boolean;
} {
  const { user, token, loading } = useAuth();
  const isLoggedIn = Boolean(user || token);

  useEffect(() => {
    if (loading || isLoggedIn) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      saveLoginReturn(window.location.pathname + window.location.search);
    }
    router.replace("/auth/login");
  }, [loading, isLoggedIn]);

  return { user, loading, isLoggedIn };
}
