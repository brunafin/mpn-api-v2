/** Fotos de iPhone costumam ter 3–8 MB; 10 MB é um teto usual em 2026. */
export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_MB = IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024);

export const IMAGE_UPLOAD_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const COMPANY_PHOTO_MAX_COUNT = 10;

export function imageUploadTooLargeMessage(): string {
  return `A imagem deve ter no máximo ${IMAGE_UPLOAD_MAX_MB} MB.`;
}
