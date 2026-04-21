import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !bucket) {
  console.warn("[R2] R2_ENDPOINT / R2_BUCKET_NAME が設定されていません");
}

const r2Client =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        // R2 / S3 互換では path-style が安定（署名 URL とブラウザ PUT の不一致を防ぐ）
        forcePathStyle: true,
      })
    : null;

export async function createSignedUploadUrl(key: string, contentType: string) {
  if (!r2Client || !endpoint || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 * 5 });

  /** ブラウザから読める公開 URL（R2.dev / カスタムドメイン）。未設定時は API エンドポイント直下の path-style URL */
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  const publicUrl = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${key}`
    : `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;

  return { uploadUrl, publicUrl };
}

