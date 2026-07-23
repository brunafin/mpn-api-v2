import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOperatingScheduleDto } from './dto/create-operating-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating-schedule.entity';
import { Repository } from 'typeorm';
import { UrlQueryParamOperatingScheduleDto } from './dto/url-query-operating-schedule.dto';
import { Court } from 'src/courts/entities/court.entity';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';

@Injectable()
export class OperatingScheduleService {
  constructor(
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
  ) {}

  private async assertCourtIdOwnedBy(
    courtId: number,
    ownerPublicId: string,
  ): Promise<Court> {
    const court = await this.courtRepository.findOne({
      where: { id: courtId },
      relations: { company: { administrator: true } },
    });
    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }
    assertAdministratorOwns(
      court.company?.administrator?.public_id,
      ownerPublicId,
    );
    return court;
  }

  async create(
    createOperatingScheduleDto: CreateOperatingScheduleDto,
    ownerPublicId: string,
  ) {
    await this.assertCourtIdOwnedBy(
      createOperatingScheduleDto.court_id,
      ownerPublicId,
    );
    if (
      createOperatingScheduleDto.is_fixed === true &&
      !createOperatingScheduleDto.company_customer_id
    ) {
      throw new ForbiddenException(
        'Horários fixos devem ter um cliente associado.',
      );
    }
    return this.operatingScheduleRepository.save(createOperatingScheduleDto);
  }

  async findAllByCourtId(
    query: UrlQueryParamOperatingScheduleDto,
    ownerPublicId: string,
  ) {
    await this.assertCourtIdOwnedBy(query.courtId, ownerPublicId);
    return this.operatingScheduleRepository.find({
      where: { court_id: query.courtId },
    });
  }
}
