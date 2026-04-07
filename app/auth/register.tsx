import React, { useEffect } from "react";
import { router } from "expo-router";

/** Registration uses LINE login; this screen redirects to login. */
export default function RegisterScreen() {
  useEffect(() => {
    router.replace("/auth/login");
  }, []);
  return null;
}
