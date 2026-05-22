import { useEffect } from "react";
import { router } from "expo-router";

/** Legacy route: redirect to Google sign-in. */
export default function RegisterScreen() {
  useEffect(() => {
    router.replace("/auth/login");
  }, []);
  return null;
}
