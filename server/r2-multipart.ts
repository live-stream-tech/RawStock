import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildR2PublicObjectUrl } from "../lib/r2-public-url";
import { getR2PublicBaseUrl } from "./lib/directR2MediaUrl";

/** Re-use S3 client from r2.ts without circular imports — duplicate minimal client setup */
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const r2Client =
  endpoint && accessKeyId && secretAccessKey && bucket
    ? new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
        forcePathStyle: true,
      })
    : null;

export type MultipartUploadInit = {
  key: string;
  uploadId: string;
  partSize: number;
  publicUrl: string | null;
};

export type CompletedPart = { partNumber: number; etag: string };

/** S3-compatible minimum part size (except the last part). */
export const R2_MULTIPART_PART_BYTES = 5 * 1024 * 1024;

function requireClient() {
  if (!r2Client || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }
  return { client: r2Client, bucket };
}

export async function startMultipartUpload(
  key: string,
  contentType: string,
): Promise<MultipartUploadInit> {
  const { client, bucket: b } = requireClient();
  const ct = contentType.split(";")[0].trim() || "application/octet-stream";
  const out = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: b,
      Key: key,
      ContentType: ct,
    }),
  );
  const uploadId = out.UploadId;
  if (!uploadId) throw new Error("R2 did not return a multipart upload id");

  const publicBase = getR2PublicBaseUrl();
  const publicUrl = publicBase ? buildR2PublicObjectUrl(publicBase, key) : null;

  return {
    key,
    uploadId,
    partSize: R2_MULTIPART_PART_BYTES,
    publicUrl,
  };
}

export async function signMultipartUploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> {
  const { client, bucket: b } = requireClient();
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    throw new Error("Invalid part number");
  }
  const cmd = new UploadPartCommand({
    Bucket: b,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(client, cmd, { expiresIn: 60 * 30 });
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<void> {
  const { client, bucket: b } = requireClient();
  if (!parts.length) throw new Error("No parts to complete");
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: b,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sorted.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const { client, bucket: b } = requireClient();
  try {
    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: b,
        Key: key,
        UploadId: uploadId,
      }),
    );
  } catch {
    /* ignore */
  }
}
