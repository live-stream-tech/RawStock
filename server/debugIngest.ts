/**
 * 開発用ローカル ingest。本番では一切送信しない（プライバシー・セキュリティ）。
 */
export function debugIngestServer(body: Record<string, unknown>, sessionId = "88cb7d"): void {
  if (process.env.NODE_ENV === "production") return;
  fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": sessionId },
    body: JSON.stringify(body),
  }).catch(() => {});
}
