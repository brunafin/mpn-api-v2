import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { Person } from './entities/person.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly peopleRepository: Repository<Person>,
  ) {}

  create(createPersonDto: CreatePersonDto) {
    const person = this.peopleRepository.create(createPersonDto);
    return this.peopleRepository.save(person);
  }

  findAll() {
    return this.peopleRepository.find();
  }

  findOne(id: number) {
    return this.peopleRepository.findOne({ where: { id } });
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.peopleRepository.findOne({ where: { id } });
    if (!person) {
      throw new InternalServerErrorException();
    }
    this.peopleRepository.merge(person, updatePersonDto);
    return this.peopleRepository.save(person);
  }

  remove(id: number) {
    return this.peopleRepository.delete({ id });
  }
}
