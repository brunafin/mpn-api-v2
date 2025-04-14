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
  constructor(private readonly companiesService: CompaniesService) { }

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
          logo_url:
            'https://storage.googleapis.com/mpn-bucket_public/mpn/logo_underline.svg',
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
          public_id: { type: 'string', format: 'uuid', example: 'f4609a1d-6be9-4eda-9ca2-7f6d29a301f3' },
          name: { type: 'string', example: 'Nena Esportes' },
          phone: { type: 'string', example: '51999365300' },
          logo_url: { type: 'string', nullable: true, example: null },
          instagram_url: { type: 'string', example: 'https://instagram.com/marcapranos' },
          facebook_url: { type: 'string', example: 'https://facebook.com/marcapranos' },
          cep: { type: 'string', example: '94090000' },
          street: { type: 'string', example: 'Rua das Quadras' },
          number: { type: 'string', example: '123' },
          city: { type: 'string', example: 'Gravataí' },
          neighborhood: { type: 'string', example: 'Centro' },
          uf: { type: 'string', example: 'RS' },
        },
      },
    },
  })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':public_id')
  @ApiOperation({ summary: 'Obter detalhes de uma empresa' })
  @ApiOkResponse({
    description: 'Detalhes da empresa retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        public_id: { type: 'string', format: 'uuid', example: 'f4609a1d-6be9-4eda-9ca2-7f6d29a301f3' },
        name: { type: 'string', example: 'Nena Esportes' },
        phone: { type: 'string', example: '51999365300' },
        logo_url: { type: 'string', nullable: true, example: null },
        instagram_url: { type: 'string', example: 'https://instagram.com/marcapranos' },
        facebook_url: { type: 'string', example: 'https://facebook.com/marcapranos' },
        cep: { type: 'string', example: '94090000' },
        street: { type: 'string', example: 'Rua das Quadras' },
        number: { type: 'string', example: '123' },
        city: { type: 'string', example: 'Gravataí' },
        neighborhood: { type: 'string', example: 'Centro' },
        uf: { type: 'string', example: 'RS' },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                example:
                  'https://storage.googleapis.com/bucket/image1.jpg',
              },
            },
          },
        },
      },
    },
  })
  findOne(@Param('public_id') public_id: string) {
    return this.companiesService.findOneByPublicId(public_id);
  }

  @Patch(':public_id')
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
          logo_url:
            'https://storage.googleapis.com/mpn-bucket_public/mpn/logo_underline.svg',
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
          images: [
            {
              url: 'https://storage.googleapis.com/mpn-bucket_public/mpn/image1.jpg',
            },
            {
              url: 'https://storage.googleapis.com/mpn-bucket_public/mpn/image2.jpg',
            },
          ],
        },
      },
    },
  })
  update(@Param('public_id') public_id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.updateByPublicId(public_id, updateCompanyDto);
  }

  @Delete(':public_id')
  @ApiOperation({ summary: 'Remover uma empresa pelo public_id' })
  remove(@Param('public_id') public_id: string) {
    return this.companiesService.removeByPublicId(public_id);
  }
}
