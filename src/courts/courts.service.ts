import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
  ) {}

  create(createCourtDto: CreateCourtDto) {
    return this.courtRepository.save(createCourtDto);
  }

  findAllByCompanyId(company_id: string) {
    return this.courtRepository.find({
      where: { company_id: Number(company_id) },
    });
  }

  findAll() {
    return this.courtRepository.find();
  }

  findOne(id: number) {
    return this.courtRepository.findOne({
      where: { id },
      relations: {
        operating_schedule: true,
      },
      select: {
        operating_schedule: {
          hour: true,
          day_of_week_id: true,
          price: true,
        },
      },
    });
  }

  async update(id: number, updateCourtDto: UpdateCourtDto) {
    const court = await this.courtRepository.findOne({ where: { id } });
    if (!court) {
      throw new NotFoundException();
    }
    this.courtRepository.merge(court, updateCourtDto);
    return this.courtRepository.save(court);
  }

  remove(id: number) {
    return this.courtRepository.delete({ id });
  }
}
