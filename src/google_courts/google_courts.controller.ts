import {
  Controller,
  // Get,
  Post,
  Body,
  // Patch,
  // Param,
  // Delete,
  UseGuards,
} from '@nestjs/common';
import { GoogleCourtsService } from './google_courts.service';
import { CreateGoogleCourtDto } from './dto/create-google_court.dto';
import { CreateBatchGoogleCourtDto } from './dto/createBatch-google_court.dto';
// import { UpdateGoogleCourtDto } from './dto/update-google_court.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('google-courts')
export class GoogleCourtsController {
  constructor(private readonly googleCourtsService: GoogleCourtsService) {}

  @Post()
  create(@Body() createGoogleCourtDto: CreateGoogleCourtDto) {
    return this.googleCourtsService.create(createGoogleCourtDto);
  }

  @Post('batch')
  createBatch(@Body() createBatchGoogleCourtDto: CreateBatchGoogleCourtDto) {
    return this.googleCourtsService.createBatch(createBatchGoogleCourtDto);
  }

  // @Get()
  // findAll() {
  //   return this.googleCourtsService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.googleCourtsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateGoogleCourtDto: UpdateGoogleCourtDto,
  // ) {
  //   return this.googleCourtsService.update(+id, updateGoogleCourtDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.googleCourtsService.remove(+id);
  // }
}
