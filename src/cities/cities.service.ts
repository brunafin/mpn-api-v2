import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  findAll() {
    return this.cityRepository.findOne({
      where: {
        is_active: true,
      },
      order: {
        name: 'ASC',
      },
      select: {
        name: true,
      },
    });
  }
}
