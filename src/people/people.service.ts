import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdatePersonDto } from './dto/update-person.dto';
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto';
import { Person } from './entities/person.entity';
import { PersonRole } from './enums/person-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';

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

  /**
   * Atualiza último acesso no máximo a cada `staleMs` (atividade autenticada).
   * Evita UPDATE em toda request; mantém o admin alinhado ao uso atual da agenda.
   */
  async touchLastLoginAtIfStale(
    personId: number,
    staleMs = 5 * 60 * 1000,
  ): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - staleMs);
    await this.peopleRepository
      .createQueryBuilder()
      .update()
      .set({ last_login_at: now })
      .where('id = :personId', { personId })
      .andWhere(
        '(last_login_at IS NULL OR last_login_at < :threshold)',
        { threshold },
      )
      .execute();
  }

  findByEmail(email: string): Promise<Person | null> {
    return this.peopleRepository.findOne({
      where: { email: ILike(email) },
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

  /** Role/status atuais para o JWT — não confiar no payload. */
  findByPublicIdForJwt(publicId: string): Promise<Pick<
    Person,
    'id' | 'public_id' | 'username' | 'status' | 'role'
  > | null> {
    return this.peopleRepository.findOne({
      where: { public_id: publicId },
      select: {
        id: true,
        public_id: true,
        username: true,
        status: true,
        role: true,
      },
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

  /** Retake de cadastro pendente: a senha/dados do último signup é que valem. */
  async updateInactiveSignup(
    personId: number,
    input: {
      name: string;
      phone?: string;
      cpf?: string;
      passwordHash: string;
      termsAcceptedAt: Date;
    },
  ): Promise<void> {
    const patch: Partial<Person> = {
      name: input.name,
      password: input.passwordHash,
      terms_accepted_at: input.termsAcceptedAt,
    };
    if (input.phone) {
      patch.phone = input.phone;
    }
    if (input.cpf) {
      patch.cpf = input.cpf;
    }
    await this.peopleRepository.update({ id: personId }, patch);
  }

  async createRepresentative(input: {
    name: string;
    username: string;
    email?: string | null;
    phone?: string | null;
    passwordHash?: string | null;
  }): Promise<Person> {
    const person = this.peopleRepository.create({
      name: input.name,
      username: input.username,
      status: true,
      role: PersonRole.REPRESENTATIVE,
      terms_accepted_at: new Date(),
    });
    person.password = input.passwordHash ?? null;
    if (input.email) person.email = input.email;
    if (input.phone) person.phone = input.phone;
    return this.peopleRepository.save(person);
  }

  async setEmail(personId: number, email: string): Promise<void> {
    await this.peopleRepository.update({ id: personId }, { email });
  }

  async findByPublicId(publicId: string): Promise<Person | null> {
    return this.peopleRepository.findOne({ where: { public_id: publicId } });
  }

  async getColorModePreference(publicId: string): Promise<{
    colorMode: 'light' | 'dark';
  }> {
    const person = await this.findByPublicId(publicId);
    if (!person) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return {
      colorMode: person.preferences_color_mode === 'dark' ? 'dark' : 'light',
    };
  }

  async updateColorModePreference(
    publicId: string,
    colorMode: 'light' | 'dark',
  ): Promise<{ colorMode: 'light' | 'dark' }> {
    const result = await this.peopleRepository.update(
      { public_id: publicId },
      { preferences_color_mode: colorMode },
    );
    if (!result.affected) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return { colorMode };
  }

  async isUsernameTaken(username: string, exceptPersonId?: number) {
    const existing = await this.peopleRepository.findOne({
      where: { username: ILike(username) },
    });
    if (!existing) return false;
    return exceptPersonId == null || existing.id !== exceptPersonId;
  }

  async isEmailTaken(email: string, exceptPersonId?: number) {
    const existing = await this.findByEmail(email);
    if (!existing) return false;
    return exceptPersonId == null || existing.id !== exceptPersonId;
  }

  async isCpfTaken(cpf: string, exceptPersonId?: number) {
    const existing = await this.findByCpf(cpf);
    if (!existing) return false;
    return exceptPersonId == null || existing.id !== exceptPersonId;
  }

  /**
   * Dono ativo via Google (e-mail já verificado pelo provedor).
   * Termos e CPF ficam para o complete-profile (só conta nova, sem termos).
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
      cpf?: string;
      termsAcceptedAt: Date;
    },
  ): Promise<void> {
    const patch: Partial<Person> = {
      terms_accepted_at: input.termsAcceptedAt,
    };
    if (input.cpf) {
      patch.cpf = input.cpf;
    }
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

  mapPortalProfile(person: Person) {
    return {
      publicId: person.public_id,
      name: person.name,
      username: person.username,
      email: person.email || null,
      phone: person.phone?.trim() || null,
      cpf: person.cpf?.trim() || null,
      cep: person.cep?.trim() || null,
      street: person.street || null,
      number: person.number || null,
      neighborhood: person.neighborhood || null,
      city: person.city || null,
      uf: person.uf?.trim() || null,
      role: person.role,
    };
  }

  async getPortalProfile(publicId: string) {
    const person = await this.findByPublicId(publicId);
    if (!person) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.mapPortalProfile(person);
  }

  async updatePortalProfile(publicId: string, dto: UpdatePortalProfileDto) {
    const person = await this.findByPublicId(publicId);
    if (!person) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const patch: Record<string, string | null> = {};

    if (dto.username && dto.username !== person.username) {
      if (await this.isUsernameTaken(dto.username, person.id)) {
        throw new ConflictException('Este usuário já está em uso.');
      }
      patch.username = dto.username;
    }
    if (dto.email !== undefined) {
      if (
        dto.email &&
        dto.email !== person.email?.toLowerCase() &&
        (await this.isEmailTaken(dto.email, person.id))
      ) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      patch.email = dto.email;
    }
    if (dto.cpf !== undefined) {
      if (dto.cpf && (await this.isCpfTaken(dto.cpf, person.id))) {
        throw new ConflictException('Já existe uma conta com este CPF.');
      }
      patch.cpf = dto.cpf;
    }
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.cep !== undefined) patch.cep = dto.cep;
    if (dto.street !== undefined) patch.street = dto.street;
    if (dto.number !== undefined) patch.number = dto.number;
    if (dto.neighborhood !== undefined) patch.neighborhood = dto.neighborhood;
    if (dto.city !== undefined) patch.city = dto.city;
    if (dto.uf !== undefined) patch.uf = dto.uf;
    if (dto.password) {
      if (!isValidPassword(dto.password)) {
        throw new BadRequestException(PASSWORD_HINT);
      }
      patch.password = await this.hashPassword(dto.password);
    }

    await this.peopleRepository.update(
      { id: person.id },
      patch as QueryDeepPartialEntity<Person>,
    );
    return this.getPortalProfile(publicId);
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
