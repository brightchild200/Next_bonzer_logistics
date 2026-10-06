import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'customer-interactions';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface UploadAttachmentParams {
  interactionId: string;
  file: File;
  uploadedBy: string;
}

export interface UploadAttachmentResult {
  path: string;
  fullPath: string;
  fileSize: number;
  mimeType: string;
  originalName: string;
}

export interface DeleteAttachmentParams {
  path: string;
}

export interface StoragePathParams {
  interactionId: string;
  fileName: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SignedUrlParams {
  path: string;
  expiresIn?: number;
  download?: boolean;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: number;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export function generateStoragePath(params: StoragePathParams): string {
  const timestamp = Date.now();
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `customer-interactions/${params.interactionId}/${timestamp}_${sanitizedName}`;
}

export function validateFileType(mimeType: string): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

export function validateAttachment(file: File): ValidationResult {
  const typeValidation = validateFileType(file.type);
  if (!typeValidation.valid) return typeValidation;

  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) return sizeValidation;

  return { valid: true };
}

export async function uploadAttachment(
  params: UploadAttachmentParams,
): Promise<{ data: UploadAttachmentResult | null; error: Error | null }> {
  const validation = validateAttachment(params.file);
  if (!validation.valid) {
    return { data: null, error: new Error(validation.error) };
  }

  const supabase = getSupabaseClient();
  const path = generateStoragePath({
    interactionId: params.interactionId,
    fileName: params.file.name,
  });

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type,
    });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const result: UploadAttachmentResult = {
    path: data.path,
    fullPath: data.fullPath,
    fileSize: params.file.size,
    mimeType: params.file.type,
    originalName: params.file.name,
  };

  return { data: result, error: null };
}

export async function deleteAttachment(
  params: DeleteAttachmentParams,
): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([params.path]);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

export async function getSignedUrl(
  params: SignedUrlParams,
): Promise<{ data: SignedUrlResult | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  const expiresIn = params.expiresIn ?? 3600;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(params.path, expiresIn, {
      download: params.download ?? false,
    });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const expiresAt = Date.now() + expiresIn * 1000;

  return {
    data: {
      signedUrl: data.signedUrl,
      expiresAt,
    },
    error: null,
  };
}

export async function getSignedUrls(
  paths: string[],
  expiresIn?: number,
  download?: boolean,
): Promise<{ data: { path: string; signedUrl: string }[] | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  const expires = expiresIn ?? 3600;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(paths, expires, {
      download: download ?? false,
    });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const results = (data ?? []).map((item) => ({
    path: item.path ?? '',
    signedUrl: item.signedUrl ?? '',
  }));

  return { data: results, error: null };
}

export function getBucketName(): string {
  return BUCKET_NAME;
}

export function getAllowedMimeTypes(): readonly string[] {
  return ALLOWED_MIME_TYPES;
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export function getMaxFileSizeMB(): number {
  return MAX_FILE_SIZE / 1024 / 1024;
}

export type { ValidationResult as StorageValidationResult };
export type { UploadAttachmentParams as StorageUploadParams };
export type { UploadAttachmentResult as StorageUploadResult };
export type { DeleteAttachmentParams as StorageDeleteParams };
export type { SignedUrlParams as StorageSignedUrlParams };
export type { SignedUrlResult as StorageSignedUrlResult };