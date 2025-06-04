import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { CompaniesCustomerService } from './companies-customer.service';
import { CreateCompaniesCustomerDto } from './dto/create-companies-customer.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('companies-customer')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('companies-customer')
export class CompaniesCustomerController {
  constructor(private readonly companiesCustomerService: CompaniesCustomerService) { }

  @Post()
  @ApiOperation({ summary: 'Criar um novo cliente de empresa' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso.' })
  create(@Body() createCompaniesCustomerDto: CreateCompaniesCustomerDto) {
    return this.companiesCustomerService.create(createCompaniesCustomerDto);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Listar todos os clientes de uma empresa específica' })
  @ApiParam({ name: 'companyId', type: Number, description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de clientes da empresa retornada com sucesso.' })
  findAllByCompany(@Param('companyId') companyId: string) {
    return this.companiesCustomerService.findAllByCompany(+companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir um cliente de empresa pelo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente removido com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado.' })
  remove(@Param('id') id: string) {
    return this.companiesCustomerService.remove(+id);
  }
}
