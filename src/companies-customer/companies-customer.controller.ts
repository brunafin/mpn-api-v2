import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CompaniesCustomerService } from './companies-customer.service';
import { CreateCompaniesCustomerDto } from './dto/create-companies-customer.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

type AuthedRequest = {
  user: { userId: string };
};

@ApiTags('companies-customer')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('companies-customer')
export class CompaniesCustomerController {
  constructor(
    private readonly companiesCustomerService: CompaniesCustomerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo cliente de empresa' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso.' })
  create(
    @Body() createCompaniesCustomerDto: CreateCompaniesCustomerDto,
    @Req() req: AuthedRequest,
  ) {
    return this.companiesCustomerService.create(
      createCompaniesCustomerDto,
      req.user.userId,
    );
  }

  @Get('company/:companyId')
  @ApiOperation({
    summary: 'Listar todos os clientes de uma empresa específica',
  })
  @ApiParam({ name: 'companyId', type: Number, description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes da empresa retornada com sucesso.',
  })
  findAllByCompany(
    @Param('companyId') companyId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.companiesCustomerService.findAllByCompany(
      +companyId,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir um cliente de empresa pelo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente removido com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.companiesCustomerService.remove(+id, req.user.userId);
  }
}
