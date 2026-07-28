// Client-side storage helpers
export {
  generateStoragePath,
  validateFileType,
  validateFileSize,
  validateAttachment,
  uploadAttachment,
  deleteAttachment,
  getSignedUrl,
  getSignedUrls,
  getBucketName,
  getAllowedMimeTypes,
  getMaxFileSize,
  getMaxFileSizeMB,
} from './customer-interactions';

export type {
  UploadAttachmentParams,
  UploadAttachmentResult,
  DeleteAttachmentParams,
  StoragePathParams,
  ValidationResult,
  SignedUrlParams,
  SignedUrlResult,
  AllowedMimeType,
} from './customer-interactions';

// Server-side storage helpers (uses service role key)
export {
  buildStoragePath,
  uploadAttachmentServer,
  deleteAttachmentServer,
  deleteAttachmentsServer,
  getSignedUrlServer,
  getSignedUrlsServer,
  listAttachmentsServer,
  getAttachmentInfoServer,
  downloadAttachmentServer,
  getBucketInfo,
  getBucketName as getServerBucketName,
  getMaxFileSize as getServerMaxFileSize,
  getAllowedMimeTypes as getServerAllowedMimeTypes,
  isValidMimeType,
} from './server-interaction-storage';

export type {
  UploadOptions,
  UploadResult,
  AttachmentFile,
  SignedUrlOptions,
  ListOptions,
  StorageError,
  AllowedMimeType as ServerAllowedMimeType,
} from './server-interaction-storage';