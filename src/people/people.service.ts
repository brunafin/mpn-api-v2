import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { Person } from './entities/person.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private readonly peopleRepository: Repository<Person>,
  ) { }

  async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return bcrypt.hash(password, saltOrRounds);
  }

  async create(createPersonDto: CreatePersonDto) {
    const person = this.peopleRepository.create(createPersonDto);
    const password = await this.hashPassword(process.env.DEFAULT_PASSWORD || 'defaultPassword');
    return this.peopleRepository.save({ ...person, password });
  }

  async findAll() {
    return plainToInstance(Person, await this.peopleRepository.find());
  }

  findOne(id: number) {
    return this.peopleRepository.findOne({ where: { id } });
  }

  findOneByUsername(username: string) {
    return this.peopleRepository.findOne({ where: { username } });
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.peopleRepository.findOne({ where: { id } });
    if (!person) {
      throw new NotFoundException();
    }
    this.peopleRepository.merge(person, updatePersonDto);
    return this.peopleRepository.save(person);
  }

  remove(id: number) {
    return this.peopleRepository.delete({ id });
  }
}
