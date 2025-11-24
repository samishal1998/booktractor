import crypto from 'crypto';
import sharp from 'sharp';
import { createSignedUploadUrl } from './storage';

export const imagePrefixMap = {
  profile: 'profiles',
  machine: 'machines',
  message: 'messages',
  document: 'documents',
} as const;

export type ImageEntity = keyof typeof imagePrefixMap;

export function buildImageObjectKey(input: {
  entity: ImageEntity;
  ownerId: string;
  entityId?: string;
  extension?: string;
}) {
  const prefix = imagePrefixMap[input.entity];
  const targetId = input.entity === 'profile' ? input.ownerId : input.entityId ?? input.ownerId;
  const ext = input.extension ? `.${input.extension}` : '';
  return `${prefix}/${targetId}/${Date.now()}-${crypto.randomUUID()}${ext}`;
}

function assertBucketConfigured() {
  if (!process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
    throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET is not configured');
  }
}

export async function optimizeAndUploadImage(params: {
  file: Blob;
  entity: ImageEntity;
  ownerId: string;
  entityId?: string;
  contentType?: string;
}) {
  assertBucketConfigured();

  if (!(params.file instanceof Blob)) {
    throw new Error('Invalid file payload');
  }

  const mimeType = params.contentType || (params.file as File).type || params.file.type || '';
  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image uploads are supported');
  }

  const arrayBuffer = await params.file.arrayBuffer();
  let pipeline = sharp(Buffer.from(arrayBuffer));
  let metadata;
  try {
    metadata = await pipeline.metadata();
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.includes('Input buffer contains unsupported image format')
        ? 'Unsupported image format. Please upload a JPG or PNG file.'
        : error instanceof Error
          ? error.message
          : 'Failed to process image'
    );
  }

  if ((metadata.width ?? 0) > 2000) {
    pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });
  }

  const optimized = await pipeline.webp({ quality: 80 }).toBuffer();
  const objectName = buildImageObjectKey({
    entity: params.entity,
    ownerId: params.ownerId,
    entityId: params.entityId,
    extension: 'webp',
  });

  const { uploadUrl, publicUrl } = await createSignedUploadUrl({
    objectName,
    contentType: 'image/webp',
  });

  const uploadBody = new Uint8Array(optimized);

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': uploadBody.byteLength.toString(),
    },
    body: uploadBody,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(text || 'Failed to upload optimized image');
  }

  return {
    url: publicUrl,
    objectName,
  };
}

