import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createSignedUploadUrl } from '../lib/storage';
import {
  buildImageObjectKey,
  imagePrefixMap,
  optimizeAndUploadImage,
} from '../lib/image-upload';

export const storageRouter = router({
  getUploadUrl: protectedProcedure
    .input(
           z.object({
             entity: z.enum(['profile', 'machine', 'message', 'document']),
        entityId: z.string().optional(),
        contentType: z.string().min(3),
      })
    )
    .mutation(async ({ ctx, input }) => {

      if (!process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Storage bucket is not configured',
        });
      }

      const extension = input.contentType.split('/')[1]?.split('+')[0];
      const objectName = buildImageObjectKey({
        entity: input.entity,
        ownerId: ctx.user.id,
        entityId: input.entityId,
        extension,
      });

      const { uploadUrl, publicUrl } = await createSignedUploadUrl({
        objectName,
        contentType: input.contentType,
      });

      return {
        uploadUrl,
        publicUrl,
        objectName,
      };
    }),
  uploadImage: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }) => {
      if (!(input instanceof FormData)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Expected multipart form data payload',
        });
      }

      const entityField = input.get('entity');
      if (typeof entityField !== 'string' || !(entityField in imagePrefixMap)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid entity',
        });
      }

      const entityIdField = input.get('entityId');
      const file = input.get('file');

      if (!(file instanceof Blob)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Image file is required',
        });
      }

      const ownerId = ctx.user.id;
      const entityId =
        typeof entityIdField === 'string' && entityIdField.length ? entityIdField : undefined;

      try {
        const result = await optimizeAndUploadImage({
          file,
          entity: entityField as keyof typeof imagePrefixMap,
          ownerId,
          entityId,
        });
        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload optimized image',
        });
      }
    }),
});

