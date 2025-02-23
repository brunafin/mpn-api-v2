import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDaysOfWeekDto } from './dto/create-days-of-week.dto';
import { UpdateDaysOfWeekDto } from './dto/update-days-of-week.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DaysOfWeek } from './entities/days-of-week.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DaysOfWeekService {
  constructor(
    @InjectRepository(DaysOfWeek)
    private readonly daysOfWeekRepository: Repository<DaysOfWeek>,
  ) {}

  create(createDaysOfWeekDto: CreateDaysOfWeekDto) {
    const dayOfWeek = this.daysOfWeekRepository.create(createDaysOfWeekDto);
    return this.daysOfWeekRepository.save(dayOfWeek);
  }

  findAll() {
    return this.daysOfWeekRepository.find({ order: { ref: 'ASC' } });
  }

  findOne(id: number) {
    return this.daysOfWeekRepository.findOne({ where: { id } });
  }

  async update(id: number, updateDaysOfWeekDto: UpdateDaysOfWeekDto) {
    const dayOfWeek = await this.daysOfWeekRepository.findOne({
      where: { id },
    });
    if (!dayOfWeek) {
      throw new NotFoundException();
    }
    this.daysOfWeekRepository.merge(dayOfWeek, updateDaysOfWeekDto);
    return this.daysOfWeekRepository.save(dayOfWeek);
  }

  remove(id: number) {
    return this.daysOfWeekRepository.delete({ id });
  }
}
