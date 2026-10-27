import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { CreatePlatformPaymentDto } from './dto/create-platform-payment.dto';
import { ListPlatformClientsQueryDto } from './dto/list-platform-clients-query.dto';
import { MarkPlatformPaymentPaidDto } from './dto/mark-platform-payment-paid.dto';
import { UpdatePlatformClientAccessDto } from './dto/update-platform-client-access.dto';
import { UpdatePlatformClientPlanDto } from './dto/update-platform-client-plan.dto';
import { UpdatePlatformClientRepresentativeDto } from './dto/update-platform-client-representative.dto';
import { UpdatePlatformCourtVisibilityDto } from './dto/update-platform-court-visibility.dto';
import { UpdateDelinquencyPolicyDto } from './dto/update-delinquency-policy.dto';
import { UpdatePlatformMaintenanceDto } from './dto/update-platform-maintenance.dto';
import { BillingService } from 'src/billing/billing.service';
import { PlatformMaintenanceService } from './platform-maintenance.service';
import { PlatformService } from './platform.service';

type AuthedRequest = {
  user: { userId: string };
};

@Controller('platform')
@ApiTags('platform')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly maintenanceService: PlatformMaintenanceService,
    private readonly billingService: BillingService,
  ) {}

  @Get('maintenance')
  @ApiOperation({ summary: 'Estado de manutenção do site público' })
  getMaintenance() {
    return this.maintenanceService.get();
  }

  @Patch('maintenance')
  @ApiOperation({ summary: 'Ligar ou desligar a manutenção do site público' })
  updateMaintenance(@Body() dto: UpdatePlatformMaintenanceDto) {
    return this.maintenanceService.update(dto);
  }

  @Get('delinquency')
  @ApiOperation({ summary: 'Prazo de bloqueio por mensalidade em atraso' })
  getDelinquencyPolicy() {
    return this.maintenanceService.getDelinquencyPolicy();
  }

  @Patch('delinquency')
  @ApiOperation({
    summary: 'Alterar o dia do bloqueio por mensalidade e aplicar nas arenas',
  })
  async updateDelinquencyPolicy(@Body() dto: UpdateDelinquencyPolicyDto) {
    const saved = await this.maintenanceService.updateDelinquencyPolicy(
      dto.blockAfterDays,
    );
    const applied = await this.billingService.applyDelinquencyPolicy();
    return { ...saved, ...applied };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Indicadores da home do admin' })
  getDashboard(@Req() req: AuthedRequest) {
    return this.platformService.getDashboard(new Date(), req.user.userId);
  }

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

  @Delete('clients/:companyPublicId')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Excluir cliente por completo (dono, estabelecimento, quadras, agendas e reservas)',
  })
  deleteClient(@Param('companyPublicId') companyPublicId: string) {
    return this.platformService.deleteClient(companyPublicId);
  }

  @Patch('clients/:companyPublicId/plan')
  @ApiOperation({ summary: 'Vincular/atualizar plano do cliente' })
  updateClientPlan(
    @Param('companyPublicId') companyPublicId: string,
    @Body() dto: UpdatePlatformClientPlanDto,
  ) {
    return this.platformService.updateClientPlan(companyPublicId, dto);
  }

  @Patch('clients/:companyPublicId/access')
  @ApiOperation({
    summary: 'Restringir ou liberar escrita no manager (inadimplência)',
  })
  updateClientAccess(
    @Param('companyPublicId') companyPublicId: string,
    @Body() dto: UpdatePlatformClientAccessDto,
  ) {
    return this.platformService.updateClientAccess(companyPublicId, dto);
  }

  @Patch('clients/:companyPublicId/representative')
  @ApiOperation({ summary: 'Definir o representante comercial da arena' })
  updateClientRepresentative(
    @Param('companyPublicId') companyPublicId: string,
    @Body() dto: UpdatePlatformClientRepresentativeDto,
  ) {
    return this.platformService.updateClientRepresentative(companyPublicId, dto);
  }

  @Patch('clients/:companyPublicId/courts/:courtPublicId/visibility')
  @ApiOperation({ summary: 'Mostrar ou ocultar quadra no portal público' })
  setCourtVisibility(
    @Param('companyPublicId') companyPublicId: string,
    @Param('courtPublicId') courtPublicId: string,
    @Body() dto: UpdatePlatformCourtVisibilityDto,
  ) {
    return this.platformService.setCourtVisibility(
      companyPublicId,
      courtPublicId,
      dto,
    );
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
