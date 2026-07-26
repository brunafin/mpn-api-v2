import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MercadoPagoService } from 'src/mercado-pago/mercado-pago.service';
import { BillingService } from './billing.service';

type MercadoPagoWebhookBody = {
  action?: string;
  type?: string;
  data?: { id?: string | number };
  id?: string | number;
};

@ApiExcludeController()
@SkipThrottle()
@Controller('webhooks/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly mercadoPago: MercadoPagoService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: MercadoPagoWebhookBody,
    @Query('topic') topic?: string,
    @Query('id') queryId?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const dataId = String(
      body?.data?.id ?? body?.id ?? queryId ?? '',
    ).trim();

    if (!dataId) {
      this.logger.warn('Webhook MP sem data.id — ignorado.');
      return { ok: true };
    }

    const valid = this.mercadoPago.validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });
    if (!valid) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    const eventType = (body?.type || topic || '').toLowerCase();

    if (eventType === 'payment' || body?.action?.startsWith('payment.')) {
      await this.billingService.handleWebhookPaymentNotification(dataId);
    }

    return { ok: true };
  }
}
