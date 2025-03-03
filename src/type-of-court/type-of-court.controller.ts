import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TypeOfCourtService } from './type-of-court.service';
import { CreateTypeOfCourtDto } from './dto/create-type-of-court.dto';
import { UpdateTypeOfCourtDto } from './dto/update-type-of-court.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('type-of-court')
@ApiTags('type-of-court')
export class TypeOfCourtController {
  constructor(private readonly typeOfCourtService: TypeOfCourtService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um tipo de quadra' })
  @ApiBody({
    description: 'Dados para criar um novo tipo de quadra',
    type: CreateTypeOfCourtDto,
    examples: {
      exemplo1: {
        summary: 'Tipo de quadra com todos os dados preenchidos',
        value: {
          name: 'Futsal',
          description: 'Quadra de futsal',
        },
      },
    },
  })
  create(@Body() createTypeOfCourtDto: CreateTypeOfCourtDto) {
    return this.typeOfCourtService.create(createTypeOfCourtDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os tipos de quadra' })
  @ApiOkResponse({
    description: 'Lista de todos os tipos de quadra retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Futsal' },
          description: { type: 'string', example: 'Quadra de futsal' },
        },
      },
    },
  })
  findAll() {
    return this.typeOfCourtService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um tipo de quadra pelo ID' })
  @ApiOkResponse({
    description: 'Tipo de quadra retornado com sucesso',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Futsal' },
        description: { type: 'string', example: 'Quadra de futsal' },
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.typeOfCourtService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um tipo de quadra pelo ID' })
  @ApiBody({
    description: 'Dados para atualizar um tipo de quadra',
    type: UpdateTypeOfCourtDto,
    examples: {
      exemplo1: {
        summary: 'Tipo de quadra com o nome atualizado',
        value: {
          name: 'Campo',
          description: 'Quadra de futebol',
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() updateTypeOfCourtDto: UpdateTypeOfCourtDto,
  ) {
    return this.typeOfCourtService.update(+id, updateTypeOfCourtDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um tipo de quadra pelo ID' })
  remove(@Param('id') id: string) {
    return this.typeOfCourtService.remove(+id);
  }
}
