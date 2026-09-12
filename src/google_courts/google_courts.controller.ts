import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { CreateBatchGoogleCourtDto } from './dto/createBatch-google_court.dto';
import { CreateGoogleCourtDto } from './dto/create-google_court.dto';
import { ImportGoogleCourtsDto } from './dto/import-google_courts.dto';
import { ListGoogleCourtsQueryDto } from './dto/list-google_courts-query.dto';
import { SearchGoogleCourtsDto } from './dto/search-google_courts.dto';
import { UpdateGoogleCourtOutreachDto } from './dto/update-google_court.dto';
import { GoogleCourtsService } from './google_courts.service';

@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
@ApiTags('google-courts')
@Controller('google-courts')
export class GoogleCourtsController {
  constructor(private readonly googleCourtsService: GoogleCourtsService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de quadras encontradas no Google' })
  list(@Query() query: ListGoogleCourtsQueryDto) {
    return this.googleCourtsService.list(query);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Cidades já importadas no catálogo' })
  listCities() {
    return this.googleCourtsService.listCities();
  }

  @Post('search')
  @ApiOperation({
    summary: 'Buscar quadras no Google Places (não grava no portfólio)',
  })
  search(@Body() dto: SearchGoogleCourtsDto) {
    return this.googleCourtsService.searchCity(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Puxar quadras selecionadas para o portfólio' })
  importPlaces(@Body() dto: ImportGoogleCourtsDto) {
    return this.googleCourtsService.importPlaces(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Ingestão em lote (n8n / Places)' })
  createBatch(@Body() dto: CreateBatchGoogleCourtDto) {
    return this.googleCourtsService.createBatch(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Incluir uma quadra manualmente no catálogo' })
  create(@Body() dto: CreateGoogleCourtDto) {
    return this.googleCourtsService.create(dto);
  }

  @Get(':googlePlaceId')
  @ApiOperation({ summary: 'Detalhe de uma quadra prospecto' })
  findOne(@Param('googlePlaceId') googlePlaceId: string) {
    return this.googleCourtsService.findOne(googlePlaceId);
  }

  @Patch(':googlePlaceId')
  @ApiOperation({ summary: 'Atualizar status de contato do prospecto' })
  update(
    @Param('googlePlaceId') googlePlaceId: string,
    @Body() dto: UpdateGoogleCourtOutreachDto,
  ) {
    return this.googleCourtsService.updateOutreach(googlePlaceId, dto);
  }
}
