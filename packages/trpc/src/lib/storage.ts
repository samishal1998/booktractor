import { Storage } from '@google-cloud/storage';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const BUCKET = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const KEY = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT;

let storage: Storage | null = null;

function getStorage() {
  if (!storage) {
    const credentials = KEY ? JSON.parse(Buffer.from(KEY, 'base64').toString('utf-8')) : undefined;
    storage = new Storage({
      projectId: PROJECT_ID,
      credentials,
    });
  }
  return storage;
}

export async function createSignedUploadUrl({
  objectName,
  contentType,
  expiresInSeconds = 60 * 5,
}: {
  objectName: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  if (!BUCKET) {
    throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET is not configured');
  }

  const bucket = getStorage().bucket(BUCKET);
  const file = bucket.file(objectName);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInSeconds * 1000,
    contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${BUCKET}/${objectName}`;
  return { uploadUrl, publicUrl };
}

