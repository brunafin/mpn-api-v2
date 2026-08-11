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
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('sports')
@ApiTags('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  @UseGuards(PlatformAdminGuard)
  create(@Body() createSportDto: CreateSportDto) {
    return this.sportsService.create(createSportDto);
  }

  @Get()
  findAll() {
    return this.sportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sportsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(PlatformAdminGuard)
  update(@Param('id') id: string, @Body() updateSportDto: UpdateSportDto) {
    return this.sportsService.update(+id, updateSportDto);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  remove(@Param('id') id: string) {
    return this.sportsService.remove(+id);
  }
}
