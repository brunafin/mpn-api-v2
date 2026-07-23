import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { CreatePlatformPaymentDto } from './dto/create-platform-payment.dto';
import { ListPlatformClientsQueryDto } from './dto/list-platform-clients-query.dto';
import { MarkPlatformPaymentPaidDto } from './dto/mark-platform-payment-paid.dto';
import { UpdatePlatformClientPlanDto } from './dto/update-platform-client-plan.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@ApiTags('platform')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('clients')
  @ApiOperation({ summary: 'Listar clientes (arenas) da plataforma' })
  listClients(@Query() query: ListPlatformClientsQueryDto) {
    return this.platformService.listClients(query);
  }

  @Get('clients/:companyPublicId')
  @ApiOperation({ summary: 'Detalhe de um cliente da plataforma' })
  getClient(@Param('companyPublicId') companyPublicId: string) {
    return this.platformService.getClient(companyPublicId);
  }

  @Patch('clients/:companyPublicId/plan')
  @ApiOperation({ summary: 'Vincular/atualizar plano do cliente' })
  updateClientPlan(
    @Param('companyPublicId') companyPublicId: string,
    @Body() dto: UpdatePlatformClientPlanDto,
  ) {
    return this.platformService.updateClientPlan(companyPublicId, dto);
  }

  @Post('clients/:companyPublicId/payments')
  @ApiOperation({ summary: 'Adicionar parcela mensal (em aberto)' })
  createPayment(
    @Param('companyPublicId') companyPublicId: string,
    @Body() dto: CreatePlatformPaymentDto,
  ) {
    return this.platformService.createPayment(companyPublicId, dto);
  }

  @Patch('clients/:companyPublicId/payments/:paymentId/mark-paid')
  @ApiOperation({ summary: 'Marcar parcela como paga' })
  markPaymentPaid(
    @Param('companyPublicId') companyPublicId: string,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: MarkPlatformPaymentPaidDto,
  ) {
    return this.platformService.markPaymentPaid(
      companyPublicId,
      paymentId,
      dto,
    );
  }
}
