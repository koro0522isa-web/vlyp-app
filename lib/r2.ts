import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2エンドポイント: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
// 環境変数 CLOUDFLARE_R2_ENDPOINT に上記URLを設定するか、
// R2_ACCOUNT_ID から自動生成する
function getR2Endpoint(): string {
  if (process.env.CLOUDFLARE_R2_ENDPOINT) {
    return process.env.CLOUDFLARE_R2_ENDPOINT;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  throw new Error('R2 endpoint not configured: set CLOUDFLARE_R2_ENDPOINT or R2_ACCOUNT_ID');
}

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY ?? process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const BUCKET =
  process.env.CLOUDFLARE_R2_BUCKET ?? process.env.R2_BUCKET_NAME ?? 'vlyp-videos';

export const PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');

/** 署名付きPUT URLを発行する（有効期限: 1時間） */
export async function createPresignedUrl(key: string, contentType: string): Promise<string> {
  const r2 = getR2Client();
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

/** R2からオブジェクトを削除する */
export async function deleteObject(key: string): Promise<void> {
  const r2 = getR2Client();
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
