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

  async canCreateUsername(username: string): Promise<{ canCreate: boolean; message?: string }> {
    const existing = await this.peopleRepository.findOne({ where: { username } });
    if (existing) {
      return { canCreate: false, message: 'O usuário já existe' };
    }
    return { canCreate: true };
  }

  async create(createPersonDto: CreatePersonDto) {
    const person = this.peopleRepository.create(createPersonDto);
    const usernameCheck = await this.canCreateUsername(person.username);
    if (!usernameCheck.canCreate) {
      throw new NotFoundException(usernameCheck.message);
    }
    const password = await this.hashPassword(process.env.DEFAULT_PASSWORD || 'defaultPassword');

    return this.peopleRepository.save({ ...person, password });
  }

  async findAll() {
    return plainToInstance(Person, await this.peopleRepository.find());
  }

  findOne(id: number) {
    return this.peopleRepository.findOne({ where: { id } });
  }

  async findOneByUsername(username: string) {
    const person = await this.peopleRepository.findOne({
      where: { username },
      relations: ['companies'],
    });

    if (!person) {
      return null;
    }

    return {
      username: person.username,
      password: person.password,
      public_id: person.public_id,
      companies: person.companies,
    };
  }

  async findOneByCompanyPublicId(companyPublicId: string) {
    const person = await this.peopleRepository
      .createQueryBuilder('person')
      .leftJoinAndSelect('person.companies', 'company')
      .where('company.public_id = :companyPublicId', { companyPublicId })
      .getOne();

    if (!person) {
      return null;
    }

    return {
      id: person.id,
      password: person.password,
    };
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.peopleRepository.findOne({ where: { id } });
    if (!person) {
      throw new NotFoundException();
    }
    this.peopleRepository.merge(person, updatePersonDto);
    return this.peopleRepository.save(person);
  }

  async updatePassword(personId: number, hashedPassword: string) {
    const person = await this.peopleRepository.findOne({ where: { id: personId } });
    if (!person) {
      throw new NotFoundException('Usuário não encontrado');
    }
    person.password = hashedPassword;
    await this.peopleRepository.save(person);
    return { message: 'Senha alterada' };
  }

  remove(id: number) {
    return this.peopleRepository.delete({ id });
  }
}
