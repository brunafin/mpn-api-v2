import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

// @UseGuards(AuthGuard('jwt'))
// @ApiBearerAuth()
@Controller('public-court-schedules')
@ApiTags('public-court-schedules')
export class PublicCourtSchedulesController {
  constructor(
    private readonly courtSchedulesService: CourtSchedulesService,
  ) { }

  @Get('/where-to-play')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Encontre onde jogar' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'city', type: String, required: true })
  findWhereToPlay(
    @Query('date') date: Date,
    @Query('city') city: string,
  ) {
    return this.courtSchedulesService.findWhereToPlay({
      city,
      date,
    });
  }

  @Get('/details')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Detalhes da quadra' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'slug', type: String, required: true })
  findDetailsCourt(
    @Query('slug') slug: string,
    @Query('date') date: Date,
  ) {
    return this.courtSchedulesService.findDetailsCourt({
      slug,
      date
    });
  }

    @Get('/available-hours-by-court')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Horários detalhes da quadra' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'slug', type: String, required: true })
  findAvailableHoursByCourt(
    @Query('slug') slug: string,
    @Query('date') date: Date,
  ) {
    return this.courtSchedulesService.findAvailableHoursByCourt({
      slug,
      date
    });
  }
}
