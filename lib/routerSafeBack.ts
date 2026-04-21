import { router } from "expo-router";

/**
 * PWA スタンドアロンやディープリンクでポリシーだけ開いたとき、`router.back()` が無操作になり得る。
 * 履歴があれば戻り、なければタブのホームへ置き換える。
 */
export function routerBackOrTabHome(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)" as any);
}
