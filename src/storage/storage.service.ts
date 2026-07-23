import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

export type UploadObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    this.bucket = process.env.R2_BUCKET_NAME?.trim() || '';
    this.publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL?.trim() || '').replace(
      /\/$/,
      '',
    );

    if (accountId && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      this.client = null;
      this.logger.warn(
        'Cloudflare R2 não configurado (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME). Upload de logo indisponível.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.bucket && this.publicBaseUrl);
  }

  /**
   * Prefixo "pasta" por estabelecimento no R2.
   * Ex.: companies/{companyPublicId}/logo.webp
   */
  companyLogoKey(companyPublicId: string, extension: string): string {
    const ext = extension.replace(/^\./, '').toLowerCase();
    return `companies/${companyPublicId}/logo.${ext}`;
  }

  /**
   * Foto da arena (galeria, até 3).
   * Ex.: companies/{companyPublicId}/photos/{uuid}.webp
   */
  companyPhotoKey(
    companyPublicId: string,
    photoId: string,
    extension: string,
  ): string {
    const ext = extension.replace(/^\./, '').toLowerCase();
    const id = photoId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `companies/${companyPublicId}/photos/${id}.${ext}`;
  }

  publicUrlForKey(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  async uploadObject(input: UploadObjectInput): Promise<string> {
    if (!this.client || !this.bucket) {
      throw new Error('Armazenamento R2 não está configurado.');
    }
    if (!this.publicBaseUrl) {
      throw new Error(
        'R2_PUBLIC_BASE_URL não configurada (URL pública do bucket/domínio custom).',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return this.publicUrlForKey(input.key);
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.client || !this.bucket) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn(`Falha ao remover objeto ${key}: ${String(error)}`);
    }
  }

  /** Extrai a key a partir de uma URL pública deste bucket, se possível. */
  keyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url || !this.publicBaseUrl) return null;
    if (!url.startsWith(`${this.publicBaseUrl}/`)) return null;
    return url.slice(this.publicBaseUrl.length + 1) || null;
  }
}
