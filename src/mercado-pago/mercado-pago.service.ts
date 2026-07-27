import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export type CreatePixPaymentInput = {
  amount: number;
  description: string;
  externalReference: string;
  idempotencyKey: string;
  payer: {
    email: string;
    firstName: string;
    lastName?: string;
    cpf: string;
  };
};

export type CreatePixPaymentResult = {
  mpPaymentId: string;
  status: string;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
  /** Expiration of the PIX QR, if provided by MP. */
  expiresAt: Date | null;
};

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string | undefined;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN')?.trim();
    this.webhookSecret = this.config
      .get<string>('MERCADOPAGO_WEBHOOK_SECRET')
      ?.trim();
  }

  isConfigured(): boolean {
    return Boolean(this.accessToken);
  }

  private client(): Payment {
    if (!this.accessToken) {
      throw new ServiceUnavailableException(
        'Pagamento PIX não está configurado. Contate o suporte.',
      );
    }
    const config = new MercadoPagoConfig({ accessToken: this.accessToken });
    return new Payment(config);
  }

  async createPixPayment(
    input: CreatePixPaymentInput,
  ): Promise<CreatePixPaymentResult> {
    const paymentApi = this.client();
    const nameParts = input.payer.firstName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName =
      input.payer.lastName?.trim() ||
      nameParts.slice(1).join(' ') ||
      firstName;

    const response = await paymentApi.create({
      body: {
        transaction_amount: Number(input.amount),
        description: input.description,
        payment_method_id: 'pix',
        external_reference: input.externalReference,
        payer: {
          email: input.payer.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: input.payer.cpf,
          },
        },
      },
      requestOptions: {
        idempotencyKey: input.idempotencyKey,
      },
    });

    const tx = response.point_of_interaction?.transaction_data;
    const expiration =
      (response as { date_of_expiration?: string | null }).date_of_expiration ??
      null;

    return {
      mpPaymentId: String(response.id),
      status: String(response.status ?? 'pending'),
      pixCopyPaste: tx?.qr_code ?? null,
      pixQrBase64: tx?.qr_code_base64 ?? null,
      expiresAt: expiration ? new Date(expiration) : this.defaultPixExpiry(),
    };
  }

  async getPaymentStatus(mpPaymentId: string): Promise<{
    id: string;
    status: string;
    externalReference: string | null;
  } | null> {
    if (!this.isConfigured()) return null;
    try {
      const paymentApi = this.client();
      const response = await paymentApi.get({ id: mpPaymentId });
      return {
        id: String(response.id),
        status: String(response.status ?? ''),
        externalReference: response.external_reference
          ? String(response.external_reference)
          : null,
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar pagamento MP ${mpPaymentId}: ${String(error)}`,
      );
      return null;
    }
  }

  /**
   * Valida x-signature do webhook Mercado Pago.
   * Sem secret configurado → rejeita (nunca aceitar webhook sem HMAC).
   */
  validateWebhookSignature(params: {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
  }): boolean {
    if (!this.webhookSecret) {
      this.logger.error(
        'MERCADOPAGO_WEBHOOK_SECRET ausente — webhook rejeitado.',
      );
      return false;
    }
    if (!params.xSignature || !params.dataId) {
      return false;
    }

    const parts = Object.fromEntries(
      params.xSignature.split(',').map((part) => {
        const [k, v] = part.split('=');
        return [k?.trim(), v?.trim()];
      }),
    );
    const ts = parts['ts'];
    const hash = parts['v1'];
    if (!ts || !hash) return false;

    const manifest = `id:${params.dataId};request-id:${params.xRequestId ?? ''};ts:${ts};`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(hash, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private defaultPixExpiry(): Date {
    // PIX dinâmico do MP costuma expirar em ~24h; usamos 30min como piso seguro de cache.
    return new Date(Date.now() + 30 * 60 * 1000);
  }
}
