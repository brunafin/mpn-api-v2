import { Controller, Get, Query } from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('public-court-schedules')
@ApiTags('public-court-schedules')
export class PublicCourtSchedulesController {
  constructor(private readonly courtSchedulesService: CourtSchedulesService) {}

  @Get('/where-to-play')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Encontre onde jogar' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'city', type: String, required: true })
  findWhereToPlay(@Query('date') date: Date, @Query('city') city: string) {
    return this.courtSchedulesService.findWhereToPlay({
      city,
      date,
    });
  }

  @Get('/where-to-play/cities')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Cidades' })
  findCitiesToPlay() {
    return this.courtSchedulesService.findCitiesToPlay();
  }

  @Get('/where-to-play/sports')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Esportes' })
  findSportsToPlay() {
    return this.courtSchedulesService.findSportsToPlay();
  }

  @Get('/details')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Detalhes da quadra' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'slug', type: String, required: true })
  findDetailsCourt(@Query('slug') slug: string, @Query('date') date: Date) {
    return this.courtSchedulesService.findDetailsCourt({
      slug,
      date,
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
      date,
    });
  }

  @Get('/all-courts')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Slug das quadras para sitemap' })
  findAllCourts() {
    return this.courtSchedulesService.findAllCourts();
  }
}
