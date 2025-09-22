import { Injectable } from '@nestjs/common';
import { CreateGoogleCourtDto } from './dto/create-google_court.dto';
// import { UpdateGoogleCourtDto } from './dto/update-google_court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleCourt } from './entities/google_court.entity';
import { Repository } from 'typeorm';
import { CreateBatchGoogleCourtDto } from './dto/createBatch-google_court.dto';
import { City } from 'src/cities/entities/city.entity';

@Injectable()
export class GoogleCourtsService {
  constructor(
    @InjectRepository(GoogleCourt)
    private readonly googleCourtRepository: Repository<GoogleCourt>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  create(createGoogleCourtDto: CreateGoogleCourtDto) {
    return this.googleCourtRepository.save({
      name: createGoogleCourtDto.name,
      google_place_id: createGoogleCourtDto.googlePlaceId,
      phone: createGoogleCourtDto.phone,
      full_address: createGoogleCourtDto.fullAddress,
      dt_last_check: new Date(),
    });
  }

  async createBatch(createGoogleCourtDtos: CreateBatchGoogleCourtDto) {
    const courts = createGoogleCourtDtos.places.map((dto) => ({
      name: dto.displayName.text,
      google_place_id: dto.id,
      phone: dto.nationalPhoneNumber,
      full_address: dto.formattedAddress,
      dt_last_check: new Date(),
    }));

    await this.googleCourtRepository
      .createQueryBuilder()
      .insert()
      .into(GoogleCourt)
      .values(courts)
      .orIgnore()
      .execute();

    const city = await this.cityRepository.findOne({
      where: { name: createGoogleCourtDtos.city },
    });

    if (city) {
      city.is_active = false;
      city.dt_last_check = new Date();
      await this.cityRepository.save(city);
    }

    return courts;
  }

  // findAll() {
  //   return `This action returns all googleCourts`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} googleCourt`;
  // }

  // update(id: number, updateGoogleCourtDto: UpdateGoogleCourtDto) {
  //   return `This action updates a #${id} googleCourt`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} googleCourt`;
  // }
}
