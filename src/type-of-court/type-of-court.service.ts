import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTypeOfCourtDto } from './dto/create-type-of-court.dto';
import { UpdateTypeOfCourtDto } from './dto/update-type-of-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOfCourt } from './entities/type-of-court.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TypeOfCourtService {
  constructor(
    @InjectRepository(TypeOfCourt)
    private typeOfCourtRepository: Repository<TypeOfCourt>,
  ) {}
  create(createTypeOfCourtDto: CreateTypeOfCourtDto) {
    return this.typeOfCourtRepository.save(createTypeOfCourtDto);
  }

  findAll() {
    return this.typeOfCourtRepository.find();
  }

  findOne(id: number) {
    return this.typeOfCourtRepository.findOne({ where: { id } });
  }

  async update(id: number, updateTypeOfCourtDto: UpdateTypeOfCourtDto) {
    const typeOfCourt = await this.typeOfCourtRepository.findOne({
      where: { id },
    });
    if (!typeOfCourt) {
      throw new NotFoundException();
    }
    this.typeOfCourtRepository.merge(typeOfCourt, updateTypeOfCourtDto);
    return this.typeOfCourtRepository.save(typeOfCourt);
  }

  remove(id: number) {
    return this.typeOfCourtRepository.delete({ id });
  }
}
