import React, { useEffect } from "react";
import { router } from "expo-router";

/** 新規登録はLINEログインで行う。この画面はLINEログインへリダイレクト。 */
export default function RegisterScreen() {
  useEffect(() => {
    router.replace("/auth/login");
  }, []);
  return null;
}
