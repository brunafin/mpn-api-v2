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
import { UpdatePlatformCourtVisibilityDto } from './dto/update-platform-court-visibility.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@ApiTags('platform')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Indicadores da home do admin' })
  getDashboard() {
    return this.platformService.getDashboard();
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
