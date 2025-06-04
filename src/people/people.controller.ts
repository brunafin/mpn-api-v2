import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@Controller('people')
@ApiTags('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) { }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova pessoa' })
  @ApiBody({
    description: 'Dados para criar uma nova pessoa',
    type: CreatePersonDto,
    examples: {
      exemplo1: {
        summary: 'Pessoa com todos os dados preenchidos',
        value: {
          name: 'João da Silva',
          phone: '11912345678',
          email: 'joao@email.com',
          cpf: '1234568900',
          born_date: '1990-05-20',
          cep: '01001000',
          street: 'Rua Exemplo',
          number: '123',
          city: 'São Paulo',
          neighborhood: 'Centro',
          uf: 'SP',
          status: true,
          username: 'joao.silva',
        },
      },
    },
  })
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.peopleService.create(createPersonDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar todas as pessoas' })
  @ApiOkResponse({
    description: 'Lista de todas as pessoas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'João da Silva' },
          phone: { type: 'string', example: '11912345678' },
          email: { type: 'string', example: 'joao@email.com' },
          cpf: { type: 'string', example: '1234568900' },
          born_date: { type: 'string', example: '1990-05-20' },
          cep: { type: 'string', example: '01001000' },
          street: { type: 'string', example: 'Rua Exemplo' },
          number: { type: 'string', example: '123' },
          city: { type: 'string', example: 'São Paulo' },
          neighborhood: { type: 'string', example: 'Centro' },
          uf: { type: 'string', example: 'SP' },
          status: { type: 'boolean', example: true },
          username: { type: 'string', example: 'joao.silva' },
        },
      },
    },
  })
  findAll() {
    return this.peopleService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Obter uma pessoa pelo ID' })
  @ApiOkResponse({
    description: 'Dados da pessoa encontrada',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'João da Silva' },
        phone: { type: 'string', example: '11912345678' },
        email: { type: 'string', example: 'joao@email.com' },
        cpf: { type: 'string', example: '1234568900' },
        born_date: { type: 'string', example: '1990-05-20' },
        cep: { type: 'string', example: '01001000' },
        street: { type: 'string', example: 'Rua Exemplo' },
        number: { type: 'string', example: '123' },
        city: { type: 'string', example: 'São Paulo' },
        neighborhood: { type: 'string', example: 'Centro' },
        uf: { type: 'string', example: 'SP' },
        status: { type: 'boolean', example: true },
        username: { type: 'string', example: 'joao.silva' },
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.peopleService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma pessoa pelo ID' })
  @ApiBody({
    description: 'Dados para atualizar uma pessoa',
    type: UpdatePersonDto,
    examples: {
      exemplo1: {
        summary: 'Atualização de todos os dados da pessoa',
        value: {
          name: 'João da Silva',
          phone: '11912345678',
          email: 'joao@email.com',
          cpf: '1234568900',
          born_date: '1990-05-20',
          cep: '01001000',
          street: 'Rua Exemplo',
          number: '123',
          city: 'São Paulo',
          neighborhood: 'Centro',
          uf: 'SP',
          status: true,
        },
      },
    },
  })
  update(@Param('id') id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.peopleService.update(+id, updatePersonDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma pessoa pelo ID' })
  remove(@Param('id') id: string) {
    return this.peopleService.remove(+id);
  }
}
