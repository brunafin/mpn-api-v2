import { Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return bcrypt.hash(password, saltOrRounds);
  }

  async canCreateUsername(
    username: string,
  ): Promise<{ canCreate: boolean; message?: string }> {
    const existing = await this.peopleRepository.findOne({
      where: { username },
    });
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
    const password = await this.hashPassword(
      process.env.DEFAULT_PASSWORD ?? 'defaultPassword',
    );

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

  /**
   * Busca por username OU e-mail (o dono faz login com o e-mail informado no
   * cadastro). Retorna também o status para o login bloquear contas ainda não
   * verificadas.
   */
  async findOneForAuth(identifier: string) {
    const person = await this.peopleRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      relations: ['companies'],
    });

    if (!person) {
      return null;
    }

    return {
      id: person.id,
      username: person.username,
      email: person.email,
      password: person.password,
      public_id: person.public_id,
      status: person.status,
      companies: person.companies,
    };
  }

  findByEmail(email: string): Promise<Person | null> {
    return this.peopleRepository.findOne({ where: { email } });
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base =
      email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 14) || 'user';

    let candidate = base;
    let suffix = 0;
    while (await this.peopleRepository.findOne({ where: { username: candidate } })) {
      suffix += 1;
      const suf = String(suffix);
      candidate = base.slice(0, 20 - suf.length) + suf;
    }
    return candidate;
  }

  /**
   * Cria o dono como inativo (status=false) até a verificação de e-mail.
   * Gera um username único (o login pode ser feito pelo e-mail).
   */
  async createInactiveOwner(input: {
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
  }): Promise<Person> {
    const username = await this.generateUniqueUsername(input.email);
    const person = this.peopleRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      username,
      password: input.passwordHash,
      status: false,
    });
    return this.peopleRepository.save(person);
  }

  async activate(personId: number): Promise<void> {
    await this.peopleRepository.update({ id: personId }, { status: true });
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
    const person = await this.peopleRepository.findOne({
      where: { id: personId },
    });
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
