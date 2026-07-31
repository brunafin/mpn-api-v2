import { Injectable, NotFoundException } from '@nestjs/common';
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
      role: person.role,
      cpf: person.cpf,
      terms_accepted_at: person.terms_accepted_at,
      companies: person.companies,
    };
  }

  async touchLastLoginAt(personId: number): Promise<void> {
    await this.peopleRepository.update(
      { id: personId },
      { last_login_at: new Date() },
    );
  }

  findByEmail(email: string): Promise<Person | null> {
    return this.peopleRepository.findOne({
      where: { email },
      relations: ['companies'],
    });
  }

  findByGoogleSub(googleSub: string): Promise<Person | null> {
    return this.peopleRepository.findOne({
      where: { google_sub: googleSub },
      relations: ['companies'],
    });
  }

  findByCpf(cpf: string): Promise<Person | null> {
    return this.peopleRepository.findOne({ where: { cpf } });
  }

  findByPublicIdWithCompanies(publicId: string): Promise<Person | null> {
    return this.peopleRepository.findOne({
      where: { public_id: publicId },
      relations: ['companies'],
    });
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
    while (
      await this.peopleRepository.findOne({ where: { username: candidate } })
    ) {
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
    cpf?: string;
    passwordHash: string;
    termsAcceptedAt?: Date;
  }): Promise<Person> {
    const username = await this.generateUniqueUsername(input.email);
    const person = this.peopleRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf: input.cpf,
      username,
      password: input.passwordHash,
      status: false,
      terms_accepted_at: input.termsAcceptedAt ?? null,
    });
    return this.peopleRepository.save(person);
  }

  /**
   * Dono ativo via Google (e-mail já verificado pelo provedor).
   * Termos/telefone ficam para o complete-profile; CPF só na conversão paga.
   */
  async createGoogleOwner(input: {
    name: string;
    email: string;
    googleSub: string;
  }): Promise<Person> {
    const username = await this.generateUniqueUsername(input.email);
    const person = this.peopleRepository.create({
      name: input.name,
      email: input.email,
      username,
      google_sub: input.googleSub,
      password: null,
      status: true,
    });
    return this.peopleRepository.save(person);
  }

  async linkGoogleSub(personId: number, googleSub: string): Promise<void> {
    await this.peopleRepository.update(
      { id: personId },
      { google_sub: googleSub, status: true },
    );
  }

  async completeOwnerProfile(
    personId: number,
    input: {
      phone?: string;
      termsAcceptedAt: Date;
    },
  ): Promise<void> {
    const patch: Partial<Person> = {
      terms_accepted_at: input.termsAcceptedAt,
    };
    if (input.phone) {
      patch.phone = input.phone;
    }
    await this.peopleRepository.update({ id: personId }, patch);
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

  async findOneByPublicIdForPasswordChange(personPublicId: string) {
    const person = await this.peopleRepository.findOne({
      where: { public_id: personPublicId },
      select: { id: true, password: true, public_id: true },
    });
    if (!person) {
      return null;
    }
    return {
      id: person.id,
      password: person.password,
      public_id: person.public_id,
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
