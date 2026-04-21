/**
 * MyMemory 翻訳 API クライアント。
 * - キー不要、匿名 5,000 words/日、`MYMEMORY_EMAIL` 設定で 50,000 words/日まで無料。
 * - レスポンス例: { responseData: { translatedText: "..." }, responseStatus: 200 }
 *
 * 公式: https://mymemory.translated.net/doc/spec.php
 */

const ENDPOINT = "https://api.mymemory.translated.net/get";

export interface MyMemoryResult {
  translatedText: string;
}

export class MyMemoryError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "MyMemoryError";
    this.status = status;
  }
}

/** MyMemory は zh / zh-CN / zh-TW を区別する。シンプルに zh → zh-CN にだけ正規化。 */
function normalizeLang(code: string): string {
  const lower = code.toLowerCase();
  if (lower === "zh") return "zh-CN";
  return lower;
}

export async function myMemoryTranslate(
  text: string,
  srcLang: string,
  dstLang: string,
): Promise<MyMemoryResult> {
  const params = new URLSearchParams();
  params.set("q", text);
  params.set("langpair", `${normalizeLang(srcLang)}|${normalizeLang(dstLang)}`);
  const email = process.env.MYMEMORY_EMAIL;
  if (email) params.set("de", email);

  const url = `${ENDPOINT}?${params.toString()}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new MyMemoryError(`MyMemory HTTP ${res.status}`, res.status);
  }

  const json = (await res.json().catch(() => null)) as
    | { responseData?: { translatedText?: string }; responseStatus?: number; responseDetails?: string }
    | null;

  if (!json || !json.responseData?.translatedText) {
    throw new MyMemoryError("MyMemory empty response");
  }

  // MyMemory は失敗時でも 200 を返し、responseDetails にエラー文字列を入れることがある
  if (typeof json.responseStatus === "number" && json.responseStatus >= 400) {
    throw new MyMemoryError(
      `MyMemory error ${json.responseStatus}: ${json.responseDetails ?? "unknown"}`,
      json.responseStatus,
    );
  }

  return { translatedText: json.responseData.translatedText };
}
