import { Alert, Platform } from "react-native";
import { captureClientError } from "./debugIngest";
import { formatUserFacingApiError } from "./query-client";

let webAlertFallbackInstalled = false;
const nativeAlert = Alert.alert.bind(Alert);

function looksLikeErrorAlert(title?: string | null, message?: string | null): boolean {
  const joined = `${title ?? ""}\n${message ?? ""}`.toLowerCase();
  return (
    /\berror\b/.test(joined) ||
    /failed/.test(joined) ||
    /could not/.test(joined) ||
    /unable to/.test(joined) ||
    /not enough/.test(joined) ||
    /sign in required/.test(joined) ||
    /login required/.test(joined) ||
    /permission required/.test(joined)
  );
}

/**
 * Web/PWA fallback for direct `Alert.alert(...)` usage across the app.
 * This keeps existing call sites responsive even before they are migrated to `alertMessage`.
 */
export function installWebAlertFallback(): void {
  if (webAlertFallbackInstalled) return;

  Alert.alert = ((title, message, buttons, options) => {
    const heading = title ?? "";
    const detail = message ?? "";
    const body = detail ? `${heading}\n\n${detail}` : heading;
    const shouldCapture = looksLikeErrorAlert(heading, detail);
    if (shouldCapture) {
      void captureClientError({
        kind: "ui_alert",
        title: heading || "Alert",
        message: detail || heading || "Unknown alert",
        extra: {
          source: "Alert.alert",
          buttonCount: Array.isArray(buttons) ? buttons.length : 0,
        },
      });
    }

    const safeButtons = Array.isArray(buttons) ? buttons : [];
    const cancelButton = safeButtons.find((button) => button.style === "cancel");
    const primaryButton =
      [...safeButtons].reverse().find((button) => button.style !== "cancel") ?? safeButtons[0];

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (safeButtons.length > 1 && primaryButton) {
        if (window.confirm(body)) {
          primaryButton.onPress?.();
        } else {
          cancelButton?.onPress?.();
        }
        return;
      }
      window.alert(body);
      primaryButton?.onPress?.();
      return;
    }
    nativeAlert(title, message, buttons, options);
  }) as typeof Alert.alert;

  webAlertFallbackInstalled = true;
}

/** Fallback to `window.alert` on web/PWA where RN `Alert` may not render */
export function alertMessage(title: string, message?: string): void {
  const body = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(body);
    return;
  }
  Alert.alert(title, message);
}

export function alertMessageThen(
  title: string,
  message: string,
  onAcknowledge: () => void | Promise<void>,
  buttonLabel = "OK",
): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    void Promise.resolve(onAcknowledge());
    return;
  }
  Alert.alert(title, message, [
    {
      text: buttonLabel,
      onPress: () => void onAcknowledge(),
    },
  ]);
}

/**
 * Shared user-facing error alert.
 * Uses JSON `error` / `message` when present and falls back to a caller-provided message.
 */
export function alertError(
  title: string,
  err: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): void {
  const detail = formatUserFacingApiError(err);
  const normalized =
    detail && detail !== "Something went wrong. Please try again."
      ? detail
      : fallbackMessage;
  void captureClientError({
    kind: "ui_alert",
    title,
    message: normalized,
    status:
      typeof (err as { status?: unknown })?.status === "number"
        ? ((err as { status?: number }).status ?? null)
        : null,
    code:
      typeof (err as { code?: unknown })?.code === "string"
        ? ((err as { code?: string }).code ?? null)
        : null,
    extra: { source: "alertError" },
  });
  alertMessage(title, normalized);
}

export function alertConfirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean },
): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`${title}\n\n${message}`)) {
      void Promise.resolve(onConfirm());
    }
    return;
  }
  Alert.alert(title, message, [
    { text: options?.cancelLabel ?? "Cancel", style: "cancel" },
    {
      text: options?.confirmLabel ?? "OK",
      style: options?.destructive ? "destructive" : "default",
      onPress: () => void onConfirm(),
    },
  ]);
}

export function alertDestructiveConfirm(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  options?: { confirmLabel?: string; cancelLabel?: string },
): void {
  alertConfirm(title, message, onConfirm, { ...options, destructive: true });
}
