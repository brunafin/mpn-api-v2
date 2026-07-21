import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './entities/sport.entity';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {}

  create(createSportDto: CreateSportDto) {
    const sport = this.sportRepository.create(createSportDto);
    return this.sportRepository.save(sport);
  }

  findAll() {
    return this.sportRepository.find({ order: { name: 'ASC' } });
  }

  findOne(id: number) {
    return this.sportRepository.findOne({ where: { id } });
  }

  async update(id: number, updateSportDto: UpdateSportDto) {
    const sport = await this.sportRepository.findOne({ where: { id } });
    if (!sport) {
      throw new NotFoundException();
    }
    this.sportRepository.merge(sport, updateSportDto);
    return this.sportRepository.save(sport);
  }

  remove(id: number) {
    return this.sportRepository.delete({ id });
  }
}
