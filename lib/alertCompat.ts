import { Alert, Platform } from "react-native";

/** Web/PWA では RN の Alert が出ない環境があるため、ブラウザのダイアログにフォールバックする */
export function alertMessage(title: string, message?: string): void {
  const body = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(body);
    return;
  }
  Alert.alert(title, message);
}

export function alertDestructiveConfirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: { confirmLabel?: string; cancelLabel?: string },
): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`${title}\n\n${message}`)) {
      void Promise.resolve(onConfirm());
    }
    return;
  }
  Alert.alert(title, message, [
    { text: options?.cancelLabel ?? "キャンセル", style: "cancel" },
    {
      text: options?.confirmLabel ?? "OK",
      style: "destructive",
      onPress: () => void onConfirm(),
    },
  ]);
}
