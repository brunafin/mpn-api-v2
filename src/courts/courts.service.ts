import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Repository } from 'typeorm';
import { Sport } from 'src/sports/entities/sport.entity';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
  ) { }

  async create(createCourtDto: CreateCourtDto) {
    const { sports, ...courtData } = createCourtDto;
    const sportsEntities = await this.courtRepository.manager.findByIds(Sport, sports);

    if (sportsEntities.length !== sports.length) {
      throw new NotFoundException('Um ou mais esportes não encontrados');
    }

    const court = this.courtRepository.create({
      ...courtData,
      court_sports: sportsEntities,
    });

    return this.courtRepository.save(court);
  }

  findAllByCompanyId(companyPublicId: string) {
    return this.courtRepository.find({
      where: { company: { public_id: companyPublicId } },
    });
  }

  findAll() {
    return this.courtRepository.find();
  }

  findOneByPublicId(publicId: string) {
    return this.courtRepository.findOne({
      where: { public_id: publicId },
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

  async updateByPublicId(publicId: string, updateCourtDto: UpdateCourtDto) {
    const court = await this.courtRepository.findOne({ where: { public_id: publicId } });
    if (!court) {
      throw new NotFoundException();
    }
    this.courtRepository.merge(court, updateCourtDto);
    return this.courtRepository.save(court);
  }

  removeByPublicId(publicId: string) {
    return this.courtRepository.delete({ public_id: publicId });
  }
}
