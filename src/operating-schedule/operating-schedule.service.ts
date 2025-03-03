import { Injectable } from '@nestjs/common';
import { CreateOperatingScheduleDto } from './dto/create-operating-schedule.dto';
import { UpdateOperatingScheduleDto } from './dto/update-operating-schedule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating-schedule.entity';
import { Repository } from 'typeorm';
import { GetOperatingScheduleURLQueryDto } from './dto/url-query-operating-schedule.dto';

@Injectable()
export class OperatingScheduleService {
  constructor(
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
  ) {}
  create(createOperatingScheduleDto: CreateOperatingScheduleDto) {
    return this.operatingScheduleRepository.save(createOperatingScheduleDto);
  }

  findAllByCourtId(query: GetOperatingScheduleURLQueryDto) {
    return this.operatingScheduleRepository.find({
      where: { court_id: Number(query.court_id) },
    });
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} operatingSchedule`;
  // }

  // update(id: number, updateOperatingScheduleDto: UpdateOperatingScheduleDto) {
  //   return `This action updates a #${id} operatingSchedule`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} operatingSchedule`;
  // }
}
