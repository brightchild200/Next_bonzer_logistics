import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'customer-interactions';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface UploadResult {
  path: string;
  fullPath: string;
  size: number;
  mimeType: string;
}

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  fullPath: string;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string;
}

export interface UploadOptions {
  interactionId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  download?: boolean;
}

export interface ListOptions {
  interactionId: string;
  limit?: number;
  offset?: number;
}

export interface StorageError {
  message: string;
  code?: string;
  statusCode?: number;
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

function validateFile(file: File): StorageError | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      message: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      code: 'INVALID_FILE_TYPE',
      statusCode: 400,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      message: `File size ${file.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (10MB)`,
      code: 'FILE_TOO_LARGE',
      statusCode: 400,
    };
  }

  return null;
}

function toStorageError(error: { message: string; name: string; statusCode?: string | number }): StorageError {
  return {
    message: error.message,
    code: error.name,
    statusCode: typeof error.statusCode === 'string' ? parseInt(error.statusCode, 10) : error.statusCode,
  };
}

export function buildStoragePath(interactionId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `customer-interactions/${interactionId}/${uuid}_${sanitizedName}`;
}

export function getBucketName(): string {
  return BUCKET_NAME;
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export function getAllowedMimeTypes(): readonly AllowedMimeType[] {
  return ALLOWED_MIME_TYPES;
}

export function isValidMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

export async function uploadAttachment(
  options: UploadOptions,
): Promise<{ data: UploadResult | null; error: StorageError | null }> {
  const validationError = validateFile(options.file);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const supabase = getSupabaseClient();
  const path = buildStoragePath(options.interactionId, options.file.name);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, options.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return {
      data: null,
      error: toStorageError(error),
    };
  }

  const result: UploadResult = {
    path: data.path,
    fullPath: data.fullPath,
    size: options.file.size,
    mimeType: options.file.type,
  };

  if (options.onProgress) {
    options.onProgress(100);
  }

  return { data: result, error: null };
}

export async function deleteAttachment(
  path: string,
): Promise<{ error: StorageError | null }> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    return {
      error: toStorageError(error),
    };
  }

  return { error: null };
}

export async function getSignedUrl(
  path: string,
  options: SignedUrlOptions = {},
): Promise<{ data: string | null; error: StorageError | null }> {
  const supabase = getSupabaseClient();
  const expiresIn = options.expiresIn ?? 3600;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn, {
      download: options.download ?? false,
    });

  if (error) {
    return {
      data: null,
      error: toStorageError(error),
    };
  }

  return { data: data.signedUrl, error: null };
}

export async function listAttachments(
  options: ListOptions,
): Promise<{ data: AttachmentFile[] | null; error: StorageError | null }> {
  const supabase = getSupabaseClient();
  const prefix = `customer-interactions/${options.interactionId}/`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix, {
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    return {
      data: null,
      error: toStorageError(error),
    };
  }

  const files: AttachmentFile[] = (data ?? []).map((file) => ({
    id: file.id ?? '',
    name: file.name,
    size: file.metadata?.size ?? 0,
    mimeType: file.metadata?.mimetype ?? 'application/octet-stream',
    path: file.name,
    fullPath: `${prefix}${file.name}`,
    createdAt: file.created_at ?? new Date().toISOString(),
    updatedAt: file.updated_at ?? new Date().toISOString(),
  }));

  return { data: files, error: null };
}

export async function getAttachmentInfo(
  path: string,
): Promise<{ data: AttachmentFile | null; error: StorageError | null }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop() ?? '',
    });

  if (error || !data || data.length === 0) {
    return {
      data: null,
      error: error
        ? toStorageError(error)
        : { message: 'File not found', code: 'NOT_FOUND', statusCode: 404 },
    };
  }

  const file = data[0];
  const result: AttachmentFile = {
    id: file.id ?? '',
    name: file.name,
    size: file.metadata?.size ?? 0,
    mimeType: file.metadata?.mimetype ?? 'application/octet-stream',
    path: file.name,
    fullPath: path,
    createdAt: file.created_at ?? new Date().toISOString(),
    updatedAt: file.updated_at ?? new Date().toISOString(),
  };

  return { data: result, error: null };
}

export async function downloadAttachment(
  path: string,
): Promise<{ data: Blob | null; error: StorageError | null }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error) {
    return {
      data: null,
      error: toStorageError(error),
    };
  }

  return { data, error: null };
}