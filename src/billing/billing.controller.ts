import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { GenerateBillingPixDto } from './dto/generate-billing-pix.dto';

type AuthedRequest = {
  user: { userId: string };
};

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('billing')
@Controller('companies/:companyPublicId/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Resumo de mensalidades do estabelecimento' })
  getSummary(
    @Param('companyPublicId') companyPublicId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.billingService.getBillingSummary(
      companyPublicId,
      req.user.userId,
    );
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Status de uma parcela (polling PIX)' })
  getPayment(
    @Param('companyPublicId') companyPublicId: string,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Req() req: AuthedRequest,
  ) {
    return this.billingService.getPaymentStatus(
      companyPublicId,
      req.user.userId,
      paymentId,
    );
  }

  @Post(':paymentId/pix')
  @ApiOperation({ summary: 'Gera ou reutiliza PIX Mercado Pago da parcela' })
  generatePix(
    @Param('companyPublicId') companyPublicId: string,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: GenerateBillingPixDto,
    @Req() req: AuthedRequest,
  ) {
    return this.billingService.generatePix(
      companyPublicId,
      req.user.userId,
      paymentId,
      dto.cpf,
    );
  }
}
