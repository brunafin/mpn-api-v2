import { Controller, Get, Query } from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CheckPublicSlotQueryDto } from './dto/check-public-slot.dto';

@Controller('public-court-schedules')
@ApiTags('public-court-schedules')
export class PublicCourtSchedulesController {
  constructor(private readonly courtSchedulesService: CourtSchedulesService) {}

  @Get('/where-to-play')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Encontre onde jogar' })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: true })
  @ApiQuery({ name: 'uf', type: String, required: false })
  @ApiQuery({ name: 'city', type: String, required: false })
  @ApiQuery({
    name: 'sport',
    type: String,
    required: false,
    description: 'ID do esporte (court_sports)',
  })
  @ApiQuery({
    name: 'period',
    type: String,
    required: false,
    description: 'morning | afternoon | evening',
  })
  findWhereToPlay(
    @Query('date') date: Date,
    @Query('uf') uf?: string,
    @Query('city') city?: string,
    @Query('sport') sport?: string,
    @Query('period') period?: string,
  ) {
    return this.courtSchedulesService.findWhereToPlay({
      uf,
      city,
      date,
      sport,
      period,
    });
  }

  @Get('/where-to-play/states')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Estados (UF) com arenas ativas' })
  findStatesToPlay() {
    return this.courtSchedulesService.findStatesToPlay();
  }

  @Get('/where-to-play/cities')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({ summary: 'Cidades (opcionalmente filtradas por UF)' })
  @ApiQuery({ name: 'uf', type: String, required: false })
  findCitiesToPlay(@Query('uf') uf?: string) {
    return this.courtSchedulesService.findCitiesToPlay(uf);
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

  @Get('/slot-available')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({
    summary: 'Confirma se um horário ainda está livre (sem cache)',
  })
  checkSlotAvailable(@Query() query: CheckPublicSlotQueryDto) {
    return this.courtSchedulesService.checkPublicSlotAvailable({
      slug: query.slug,
      date: query.date,
      startHour: query.startHour,
      courtName: query.courtName,
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

  @Get('/partner-arenas')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({
    summary: 'Arenas parceiras (planos ativos) para a landing',
  })
  findPartnerArenas() {
    return this.courtSchedulesService.findPartnerArenas();
  }

  @Get('/platform-plan-quote')
  @ApiTags('Marca Pra Nós - Público')
  @ApiOperation({
    summary: 'Cotação do plano comercial (landing)',
  })
  findPlatformPlanQuote() {
    return this.courtSchedulesService.findPlatformPlanQuote();
  }
}
