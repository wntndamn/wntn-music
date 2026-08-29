import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

const creds = {
  accessKeyId: env.s3.accessKeyId,
  secretAccessKey: env.s3.secretAccessKey,
};

// Server-side ops (put/head/bucket) use the internal endpoint.
export const s3 = new S3Client({
  region: env.s3.region,
  endpoint: env.s3.endpoint,
  forcePathStyle: env.s3.forcePathStyle,
  credentials: creds,
});

// Presigning uses the PUBLIC endpoint so the signed host matches what the
// browser will hit (presigned URLs are host-bound).
const s3Public = new S3Client({
  region: env.s3.region,
  endpoint: env.s3.publicEndpoint,
  forcePathStyle: env.s3.forcePathStyle,
  credentials: creds,
});

const BUCKET = env.s3.bucket;

// Download URL — used by the /api/audio, /cover, /avatar, /clip redirects.
// With a public bucket domain (R2) the URL is plain and CDN-cacheable; without
// one (local rustfs) it's a time-limited presigned URL.
export function presignGet(key: string): string | Promise<string> {
  if (env.s3.publicBaseUrl) return `${env.s3.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return getSignedUrl(s3Public, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}

// Best-effort delete — callers don't fail the request over a stale S3 object.
export async function deleteObject(key: string) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.error(`deleteObject ${key} failed:`, e);
  }
}

export async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    // R2 tokens are usually bucket-scoped and can't create — if the bucket is
    // already there, the next putObject proves it; a real problem fails there.
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET })).catch(() => {});
  }
}
