import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('companies')
@ApiTags('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova empresa' })
  @ApiBody({
    description: 'Dados para criar uma nova empresa',
    type: CreateCompanyDto,
    examples: {
      exemplo1: {
        summary: 'Empresa com todos os dados preenchidos',
        value: {
          name: 'Company Name',
          phone: '123456789',
          instagram_url: 'https://instagram.com/company',
          facebook_url: 'https://facebook.com/company',
          email: 'company@example.com',
          cep: '12345-678',
          street: 'Company Street',
          number: '123',
          city: 'Company City',
          neighborhood: 'Company Neighborhood',
          uf: 'CC',
          administrator_id: 1,
        },
      },
    },
  })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as empresas' })
  @ApiOkResponse({
    description: 'Lista de todas as empresas retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          instagram_url: { type: 'string' },
          facebook_url: { type: 'string' },
          email: { type: 'string' },
          cep: { type: 'string' },
          street: { type: 'string' },
          number: { type: 'string' },
          city: { type: 'string' },
          neighborhood: { type: 'string' },
          uf: { type: 'string' },
          administrator_id: { type: 'number' },
        },
      },
    },
  })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma empresa' })
  @ApiOkResponse({
    description: 'Detalhes da empresa retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        created_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-02-23T02:47:24.340Z',
        },
        updated_at: {
          type: 'string',
          format: 'date-time',
          example: '2025-02-23T02:47:24.340Z',
        },
        name: { type: 'string', example: 'Company Name' },
        phone: { type: 'string', example: '123456789' },
        instagram_url: {
          type: 'string',
          example: 'https://instagram.com/company',
        },
        facebook_url: {
          type: 'string',
          example: 'https://facebook.com/company',
        },
        email: { type: 'string', example: 'company@example.com' },
        cep: { type: 'string', example: '12345-678' },
        street: { type: 'string', example: 'Company Street' },
        number: { type: 'string', example: '123' },
        city: { type: 'string', example: 'Company City' },
        neighborhood: { type: 'string', example: 'Company Neighborhood' },
        uf: { type: 'string', example: 'CC' },
        administrator_id: { type: 'number', example: 1 },
        administrator: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'João da Silva Santos' },
          },
        },
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma empresa' })
  @ApiBody({
    description: 'Dados para atualizar uma empresa',
    type: UpdateCompanyDto,
    examples: {
      exemplo1: {
        summary: 'Atualização de todos os dados da empresa',
        value: {
          name: 'Updated Company Name',
          phone: '987654321',
          instagram_url: 'https://instagram.com/updated_company',
          facebook_url: 'https://facebook.com/updated_company',
          email: 'updated_company@example.com',
          cep: '87654-321',
          street: 'Updated Company Street',
          number: '321',
          city: 'Updated Company City',
          neighborhood: 'Updated Company Neighborhood',
          uf: 'UC',
          administrator_id: 2,
        },
      },
    },
  })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(+id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma empresa pelo ID' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(+id);
  }
}
