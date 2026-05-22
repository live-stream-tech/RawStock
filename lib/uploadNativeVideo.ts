import { uploadUserMediaBlobToR2 } from "@/lib/query-client";

/**
 * Upload a picked video from a local URI (native). Fetches a blob and delegates to
 * {@link uploadUserMediaBlobToR2} (multipart presigned when size > 4MB).
 */
export async function uploadVideoFromUri(
  uri: string,
  fileName: string,
  mime: string,
  maxBytes: number,
): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > maxBytes) {
    throw new Error(`File must be under ${Math.floor(maxBytes / (1024 * 1024))}MB`);
  }
  return uploadUserMediaBlobToR2(blob, fileName, mime);
}
