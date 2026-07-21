import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PeopleService } from '../people/people.service';
import { EmailService } from '../email/email.service';
import { EmailVerification } from './entities/email-verification.entity';

jest.mock('bcrypt');

const STRONG_PASSWORD = 'Senha@123';

describe('AuthService', () => {
  let service: AuthService;
  let peopleService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let verificationRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    process.env.DEFAULT_PASSWORD = 'bemvindo';

    peopleService = {
      findByEmail: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      createInactiveOwner: jest.fn(),
      activate: jest.fn(),
      findOneForAuth: jest.fn(),
    };
    emailService = { sendVerificationCodeEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
    verificationRepo = {
      update: jest.fn(),
      save: jest.fn((v) => Promise.resolve(v)),
      create: jest.fn((v) => v),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PeopleService, useValue: peopleService },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
        { provide: getRepositoryToken(EmailVerification), useValue: verificationRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signup', () => {
    it('cria dono inativo, gera código e envia e-mail', async () => {
      peopleService.findByEmail.mockResolvedValue(null);
      peopleService.createInactiveOwner.mockResolvedValue({ id: 7 } as never);

      const result = await service.signup({
        name: 'João',
        email: 'JOAO@Email.com',
        phone: '(51) 99999-9999',
        password: STRONG_PASSWORD,
      });

      expect(peopleService.createInactiveOwner).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'joao@email.com', phone: '51999999999' }),
      );
      expect(verificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ person_id: 7, email: 'joao@email.com' }),
      );
      expect(emailService.sendVerificationCodeEmail).toHaveBeenCalledWith(
        'joao@email.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.email).toBe('joao@email.com');
    });

    it('rejeita senha fraca', async () => {
      await expect(
        service.signup({ name: 'João', email: 'a@b.com', password: '123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.createInactiveOwner).not.toHaveBeenCalled();
    });

    it('rejeita e-mail já cadastrado', async () => {
      peopleService.findByEmail.mockResolvedValue({ id: 1 } as never);
      await expect(
        service.signup({ name: 'João', email: 'a@b.com', password: STRONG_PASSWORD }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    const futureDate = () => new Date(Date.now() + 60_000);

    it('confirma e ativa o dono com código correto', async () => {
      verificationRepo.findOne.mockResolvedValue({
        id: 1,
        person_id: 7,
        code: '123456',
        attempts: 0,
        expires_at: futureDate(),
        consumed_at: null,
      });

      const result = await service.verifyEmail('a@b.com', '123456');

      expect(peopleService.activate).toHaveBeenCalledWith(7);
      expect(verificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ consumed_at: expect.any(Date) }),
      );
      expect(result.message).toMatch(/confirmado/i);
    });

    it('incrementa tentativas em código inválido', async () => {
      verificationRepo.findOne.mockResolvedValue({
        id: 1,
        person_id: 7,
        code: '123456',
        attempts: 0,
        expires_at: futureDate(),
        consumed_at: null,
      });

      await expect(service.verifyEmail('a@b.com', '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(verificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ attempts: 1 }),
      );
      expect(peopleService.activate).not.toHaveBeenCalled();
    });

    it('rejeita código expirado', async () => {
      verificationRepo.findOne.mockResolvedValue({
        id: 1,
        person_id: 7,
        code: '123456',
        attempts: 0,
        expires_at: new Date(Date.now() - 1000),
        consumed_at: null,
      });
      await expect(service.verifyEmail('a@b.com', '123456')).rejects.toThrow(
        /expirado/i,
      );
    });

    it('rejeita quando excede o máximo de tentativas', async () => {
      verificationRepo.findOne.mockResolvedValue({
        id: 1,
        person_id: 7,
        code: '123456',
        attempts: 5,
        expires_at: futureDate(),
        consumed_at: null,
      });
      await expect(service.verifyEmail('a@b.com', '123456')).rejects.toThrow(
        /tentativas/i,
      );
    });

    it('rejeita quando não há código pendente', async () => {
      verificationRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyEmail('a@b.com', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('resendCode', () => {
    it('não revela inexistência e não envia quando não há pendência', async () => {
      peopleService.findByEmail.mockResolvedValue(null);
      const result = await service.resendCode('a@b.com');
      expect(emailService.sendVerificationCodeEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/se houver/i);
    });

    it('reenvia código quando há dono inativo', async () => {
      peopleService.findByEmail.mockResolvedValue({ id: 7, status: false } as never);
      await service.resendCode('a@b.com');
      expect(emailService.sendVerificationCodeEmail).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('bloqueia dono com e-mail não verificado', async () => {
      peopleService.findOneForAuth.mockResolvedValue({
        status: false,
        password: 'hashed',
        companies: [],
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signIn('a@b.com', STRONG_PASSWORD)).rejects.toThrow(
        /confirme seu e-mail/i,
      );
    });

    it('permite login de dono verificado sem estabelecimento', async () => {
      peopleService.findOneForAuth.mockResolvedValue({
        status: true,
        password: 'hashed',
        username: 'joao',
        public_id: 'pub-1',
        companies: [],
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.signIn('a@b.com', STRONG_PASSWORD);
      expect(result).toEqual({ access_token: 'jwt-token' });
    });

    it('rejeita credenciais inválidas', async () => {
      peopleService.findOneForAuth.mockResolvedValue(null);
      await expect(service.signIn('a@b.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
