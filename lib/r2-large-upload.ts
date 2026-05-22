/**
 * Browser uploads larger than the Vercel same-origin cap (4MB) via presigned PUT(s) to R2.
 * Requires R2 bucket CORS to allow PUT from the app origin (see docs/R2-CORS.md).
 */

import { apiRequest } from "@/lib/query-client";
import { captureClientError } from "@/lib/debugIngest";
import {
  R2_SAME_ORIGIN_UPLOAD_MAX_BYTES,
  WEB_VIDEO_PREP_MAX_OUTPUT_BYTES,
} from "@/lib/media-upload-constants";

export { WEB_VIDEO_PREP_MAX_OUTPUT_BYTES } from "@/lib/media-upload-constants";

const MULTIPART_PART_BYTES = 5 * 1024 * 1024;
const MULTIPART_THRESHOLD_BYTES = 12 * 1024 * 1024;

function assertPresignBrowserCompatible(presign: string): void {
  if (
    /x-amz-sdk-checksum-algorithm=/i.test(presign) ||
    /x-amz-checksum-/i.test(presign) ||
    /[?&]x-amz-checksum-crc32=/i.test(presign) ||
    /_cksum-crc32/i.test(presign)
  ) {
    throw new Error(
      "Upload URL includes checksum parameters incompatible with browser PUT. Redeploy the API server.",
    );
  }
}

function corsHint(): string {
  return (
    "Direct upload to storage was blocked (often missing R2 CORS). " +
    "Ask the operator to allow PUT from this site on the R2 bucket — see docs/R2-CORS.md in the repo."
  );
}

async function putWithProgress(
  uploadUrl: string,
  chunk: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  assertPresignBrowserCompatible(uploadUrl);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag")?.replace(/^"|"$/g, "") ?? "";
        if (!etag) {
          reject(
            new Error(
              "Upload succeeded but ETag was not returned. Add ExposeHeaders: ETag to your R2 bucket CORS (see docs/R2-CORS.md).",
            ),
          );
          return;
        }
        resolve(etag);
        return;
      }
      reject(new Error(`Storage upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error(corsHint()));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(chunk);
  });
}

type InitResp = {
  key: string;
  uploadId: string;
  partSize: number;
  url?: string;
  fileUrl?: string;
};

type SignPartResp = { uploadUrl: string };

type CompleteResp = { url?: string; fileUrl?: string };

export async function uploadLargeBlobViaR2Presigned(
  blob: Blob,
  fileName: string,
  contentType: string,
  options?: { onProgress?: (ratio: number) => void },
): Promise<string> {
  const ct = contentType.split(";")[0].trim() || "application/octet-stream";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (blob.size <= R2_SAME_ORIGIN_UPLOAD_MAX_BYTES) {
    throw new Error("uploadLargeBlobViaR2Presigned called for a small blob");
  }

  if (blob.size > WEB_VIDEO_PREP_MAX_OUTPUT_BYTES) {
    throw new Error(
      `Video is too large (${(blob.size / (1024 * 1024)).toFixed(0)} MB). Maximum is ${Math.floor(WEB_VIDEO_PREP_MAX_OUTPUT_BYTES / (1024 * 1024))} MB.`,
    );
  }

  const useMultipart = blob.size > MULTIPART_THRESHOLD_BYTES;
  const onProgress = options?.onProgress;

  try {
    if (!useMultipart) {
      const single = await apiRequest("POST", "/api/upload-url", {
        fileName: safeName,
        contentType: ct,
      });
      const data = (await single.json()) as { uploadUrl: string; url?: string; fileUrl?: string };
      if (!data.uploadUrl) throw new Error("Could not start upload");
      await putWithProgress(data.uploadUrl, blob, ct, onProgress);
      const publicUrl = data.url ?? data.fileUrl;
      if (!publicUrl) throw new Error("Upload response did not include a public URL");
      return publicUrl;
    }

    const initRes = await apiRequest("POST", "/api/upload-multipart/init", {
      fileName: safeName,
      contentType: ct,
    });
    const init = (await initRes.json()) as InitResp;
    if (!init.uploadId || !init.key) throw new Error("Could not start multipart upload");

    const partSize = init.partSize || MULTIPART_PART_BYTES;
    const partCount = Math.ceil(blob.size / partSize);
    const completed: { partNumber: number; etag: string }[] = [];

    try {
      for (let i = 0; i < partCount; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, blob.size);
        const chunk = blob.slice(start, end);
        const partNumber = i + 1;

        const signRes = await apiRequest("POST", "/api/upload-multipart/sign-part", {
          key: init.key,
          uploadId: init.uploadId,
          partNumber,
        });
        const sign = (await signRes.json()) as SignPartResp;
        if (!sign.uploadUrl) throw new Error("Could not sign upload part");

        const etag = await putWithProgress(sign.uploadUrl, chunk, ct);
        completed.push({ partNumber, etag });

        if (onProgress) onProgress((i + 1) / partCount);
      }

      const doneRes = await apiRequest("POST", "/api/upload-multipart/complete", {
        key: init.key,
        uploadId: init.uploadId,
        parts: completed,
      });
      const done = (await doneRes.json()) as CompleteResp;
      const publicUrl = done.url ?? done.fileUrl ?? init.url ?? init.fileUrl;
      if (!publicUrl) throw new Error("Multipart complete did not return a public URL");
      return publicUrl;
    } catch (err) {
      await apiRequest("POST", "/api/upload-multipart/abort", {
        key: init.key,
        uploadId: init.uploadId,
      }).catch(() => undefined);
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await captureClientError({
      kind: "api_error",
      title: "Large storage upload failed",
      message: msg,
      extra: {
        source: "upload",
        stage: "r2_large_upload_failed",
        fileName: safeName,
        contentType: ct,
        size: blob.size,
        multipart: useMultipart,
      },
    });
    throw err instanceof Error ? err : new Error(msg);
  }
}
