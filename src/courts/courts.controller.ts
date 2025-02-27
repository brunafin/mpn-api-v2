import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('courts')
@ApiTags('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma quadra' })
  @ApiBody({
    description: 'Dados para criar uma nova quadra',
    type: CreateCourtDto,
    examples: {
      exemplo1: {
        summary: 'Quadra com todos os dados preenchidos',
        value: {
          name: 'Quadra 1',
          company_id: 1,
          show: true,
        },
      },
    },
  })
  create(@Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(createCourtDto);
  }

  @Get('/company/:id')
  @ApiOperation({ summary: 'Listar todas as quadras de uma empresa' })
  @ApiOkResponse({
    description: 'Lista de todas as quadras de uma empresa pelo ID',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Quadra 1' },
          company_id: { type: 'number', example: 1 },
          show: { type: 'boolean', example: true },
        },
      },
    },
  })
  findAllByCompanyId(@Param('id') company_id: string) {
    return this.courtsService.findAllByCompanyId(company_id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as quadras' })
  @ApiOkResponse({
    description: 'Lista de todas as quadras',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Quadra 1' },
          company_id: { type: 'number', example: 1 },
          show: { type: 'boolean', example: true },
        },
      },
    },
  })
  findAll() {
    return this.courtsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma quadra pelo ID' })
  @ApiOkResponse({
    description: 'Dados da quadra encontrada',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Quadra 1' },
        company_id: { type: 'number', example: 1 },
        show: { type: 'boolean', example: true },
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma quadra pelo ID' })
  @ApiBody({
    description: 'Dados para atualizar uma quadra',
    type: UpdateCourtDto,
    examples: {
      exemplo1: {
        summary: 'Quadra com todos os dados preenchidos',
        value: {
          name: 'Quadra Atualizada 1',
          company_id: 1,
          show: true,
        },
      },
    },
  })
  update(@Param('id') id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(+id, updateCourtDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma quadra pelo ID' })
  remove(@Param('id') id: string) {
    return this.courtsService.remove(+id);
  }
}
