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
      })
    : null;

export async function createSignedUploadUrl(key: string, contentType: string) {
  if (!r2Client || !endpoint || !bucket) {
    throw new Error("R2 クライアントが正しく設定されていません");
  }

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, cmd, { expiresIn: 60 * 5 });

  const publicUrl = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;

  return { uploadUrl, publicUrl };
}

