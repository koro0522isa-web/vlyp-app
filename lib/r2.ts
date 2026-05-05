import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 client (S3-compatible)
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID        - Cloudflare account ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID  - R2 API token Access Key ID
 *   CLOUDFLARE_R2_SECRET_KEY     - R2 API token Secret Access Key
 *   CLOUDFLARE_R2_BUCKET         - R2 bucket name (e.g. "vlyp-videos")
 *   NEXT_PUBLIC_R2_PUBLIC_URL    - Public URL for the bucket
 *                                  e.g. https://pub-xxxx.r2.dev  (if public bucket)
 *                                  or   https://cdn.vlyp.app     (if custom domain)
 */

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const bucket = process.env.CLOUDFLARE_R2_BUCKET!;

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2.
 * Expires in 15 minutes — plenty of time for any video upload.
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 900 });
}

/**
 * Delete an object from R2.
 * key is the path inside the bucket, e.g. "userId/filename.mp4"
 */
export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Convert a storage key to the full public CDN URL.
 */
export function r2PublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL!.replace(/\/$/, '');
  return `${base}/${key}`;
}
