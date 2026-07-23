import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OperatingScheduleService } from './operating-schedule.service';
import { CreateOperatingScheduleDto } from './dto/create-operating-schedule.dto';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UrlQueryParamOperatingScheduleDto } from './dto/url-query-operating-schedule.dto';
import { AuthGuard } from '@nestjs/passport';

type AuthedRequest = {
  user: { userId: string };
};

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('operating-schedule')
@ApiTags('operating-schedule')
export class OperatingScheduleController {
  constructor(
    private readonly operatingScheduleService: OperatingScheduleService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um horário de funcionamento' })
  @ApiBody({
    description: 'Dados para criar um novo horário de funcionamento',
    type: CreateOperatingScheduleDto,
    examples: {
      exemplo1: {
        summary: 'Horário de funcionamento com todos os dados preenchidos',
        value: {
          hour: '10:00',
          price: 59.0,
          day_of_week_id: 1,
          court_id: 2,
        },
      },
    },
  })
  create(
    @Body() createOperatingScheduleDto: CreateOperatingScheduleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.operatingScheduleService.create(
      createOperatingScheduleDto,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os horários de funcionamento de uma quadra',
  })
  @ApiQuery({ name: 'court_id', required: true, type: Number })
  @ApiOkResponse({
    description: 'Lista de todos os horários de funcionamento de uma quadra',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'int', example: 1 },
          hour: { type: 'int', example: 10 },
          price: { type: 'float', example: 50.0 },
          day_of_week_id: { type: 'int', example: 1 },
          court_id: { type: 'int', example: 2 },
        },
      },
    },
  })
  findAllByCourtId(
    @Query() query: UrlQueryParamOperatingScheduleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.operatingScheduleService.findAllByCourtId(
      query,
      req.user.userId,
    );
  }
}
