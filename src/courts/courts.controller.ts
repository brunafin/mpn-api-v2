import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { UpdateCourtVisibilityDto } from './dto/update-court-visibility.dto';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

type AuthedRequest = {
  user: { userId: string; email?: string };
};

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
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
          type_of_court_id: 1,
          is_covered: false,
          is_can_have_net: true,
          sports: [1, 2],
        },
      },
    },
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Quadra 1' },
        company_id: { type: 'number', example: 1 },
        show: { type: 'boolean', example: true },
        type_of_court_id: { type: 'number', example: 1 },
        is_covered: { type: 'boolean', example: false },
        is_can_have_net: { type: 'boolean', example: true },
        sports: {
          type: 'array',
          items: { type: 'number', example: 1 },
          example: [1, 2],
          description: 'IDs dos esportes associados à quadra',
        },
      },
      required: ['name', 'company_id', 'type_of_court_id', 'sports'],
    },
  })
  create(
    @Body() createCourtDto: CreateCourtDto,
    @Req() req: AuthedRequest,
  ) {
    return this.courtsService.create(createCourtDto, req.user.userId);
  }

  @Get('/company/:public_id')
  @ApiOperation({ summary: 'Listar todas as quadras de uma empresa' })
  @ApiOkResponse({
    description: 'Lista de todas as quadras de uma empresa pelo public_id',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          public_id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-246655440000',
          },
          name: { type: 'string', example: 'Quadra 1' },
          company_id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          show: { type: 'boolean', example: true },
          is_covered: { type: 'boolean', example: false },
          is_can_have_net: { type: 'boolean', example: true },
        },
      },
    },
  })
  findAllByCompanyId(
    @Param('public_id') public_id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.courtsService.findAllByCompanyId(public_id, req.user.userId);
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
          id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-246655440000',
          },
          name: { type: 'string', example: 'Quadra 1' },
          company_id: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          show: { type: 'boolean', example: true },
          is_covered: { type: 'boolean', example: false },
          is_can_have_net: { type: 'boolean', example: true },
        },
      },
    },
  })
  findAll(@Req() req: AuthedRequest) {
    return this.courtsService.findAllForOwner(req.user.userId);
  }

  @Get(':public_id')
  @ApiOperation({ summary: 'Obter uma quadra pelo uuid' })
  @ApiOkResponse({
    description: 'Dados da quadra encontrada',
    schema: {
      type: 'object',
      properties: {
        public_id: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-246655440000',
        },
        name: { type: 'string', example: 'Quadra 1' },
        company_id: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        show: { type: 'boolean', example: true },
        is_covered: { type: 'boolean', example: false },
        is_can_have_net: { type: 'boolean', example: true },
      },
    },
  })
  findOne(
    @Param('public_id') public_id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.courtsService.findOneByPublicId(public_id, req.user.userId);
  }

  @Patch(':public_id/visibility')
  @ApiOperation({ summary: 'Mostrar ou ocultar a quadra no site público' })
  @ApiBody({ type: UpdateCourtVisibilityDto })
  setVisibility(
    @Param('public_id') public_id: string,
    @Body() body: UpdateCourtVisibilityDto,
    @Req() req: AuthedRequest,
  ) {
    return this.courtsService.setVisibility(
      public_id,
      req.user.userId,
      body.show,
    );
  }

  @Patch(':public_id')
  @ApiOperation({ summary: 'Atualizar uma quadra pelo public_id' })
  @ApiBody({
    description: 'Dados para atualizar uma quadra',
    type: UpdateCourtDto,
  })
  update(
    @Param('public_id') public_id: string,
    @Body() updateCourtDto: UpdateCourtDto,
    @Req() req: AuthedRequest,
  ) {
    return this.courtsService.updateByPublicId(
      public_id,
      updateCourtDto,
      req.user.userId,
    );
  }

  @Delete(':public_id')
  @ApiOperation({ summary: 'Remover uma quadra pelo public_id' })
  remove(@Param('public_id') public_id: string, @Req() req: AuthedRequest) {
    return this.courtsService.removeByPublicId(public_id, req.user.userId);
  }
}
