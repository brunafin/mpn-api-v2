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
import { TrialExpiryService } from '../companies/trial-expiry.service';

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
      findByCpf: jest.fn().mockResolvedValue(null),
      findByGoogleSub: jest.fn(),
      findByPublicIdWithCompanies: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      createInactiveOwner: jest.fn(),
      createGoogleOwner: jest.fn(),
      linkGoogleSub: jest.fn(),
      completeOwnerProfile: jest.fn(),
      activate: jest.fn(),
      findOneForAuth: jest.fn(),
      findOneByCompanyPublicId: jest.fn(),
      findOneByPublicIdForPasswordChange: jest.fn(),
      updatePassword: jest.fn(),
      updateInactiveSignup: jest.fn(),
      touchLastLoginAt: jest.fn().mockResolvedValue(undefined),
    };
    emailService = {
      sendVerificationCodeEmail: jest.fn(),
      sendPasswordResetCodeEmail: jest.fn(),
    };
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
        {
          provide: getRepositoryToken(EmailVerification),
          useValue: verificationRepo,
        },
        {
          provide: TrialExpiryService,
          useValue: { expireCompanyIfNeeded: jest.fn().mockResolvedValue(false) },
        },
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
        cpf: '529.982.247-25',
        password: STRONG_PASSWORD,
        acceptedTerms: true,
      });

      expect(peopleService.createInactiveOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'joao@email.com',
          phone: '51999999999',
          cpf: '52998224725',
          termsAcceptedAt: expect.any(Date),
        }),
      );
      expect(verificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          person_id: 7,
          email: 'joao@email.com',
          purpose: 'email_verification',
        }),
      );
      expect(emailService.sendVerificationCodeEmail).toHaveBeenCalledWith(
        'joao@email.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.email).toBe('joao@email.com');
    });

    it('rejeita senha fraca', async () => {
      await expect(
        service.signup({
          name: 'João',
          email: 'a@b.com',
          cpf: '52998224725',
          password: '123',
          acceptedTerms: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.createInactiveOwner).not.toHaveBeenCalled();
    });

    it('rejeita CPF inválido', async () => {
      await expect(
        service.signup({
          name: 'João',
          email: 'a@b.com',
          cpf: '123',
          password: STRONG_PASSWORD,
          acceptedTerms: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.createInactiveOwner).not.toHaveBeenCalled();
    });

    it('rejeita e-mail de conta já ativa', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 1,
        status: true,
      } as never);
      await expect(
        service.signup({
          name: 'João',
          email: 'a@b.com',
          cpf: '52998224725',
          password: STRONG_PASSWORD,
          acceptedTerms: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita CPF já cadastrado', async () => {
      peopleService.findByEmail.mockResolvedValue(null);
      peopleService.findByCpf.mockResolvedValue({ id: 2 } as never);
      await expect(
        service.signup({
          name: 'João',
          email: 'a@b.com',
          cpf: '52998224725',
          password: STRONG_PASSWORD,
          acceptedTerms: true,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(peopleService.createInactiveOwner).not.toHaveBeenCalled();
    });

    it('retoma cadastro pendente atualizando senha e reenviando o código', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 1,
        status: false,
      } as never);

      const result = await service.signup({
        name: 'João',
        email: 'a@b.com',
        cpf: '52998224725',
        password: STRONG_PASSWORD,
        acceptedTerms: true,
      });

      expect(peopleService.createInactiveOwner).not.toHaveBeenCalled();
      expect(peopleService.hashPassword).toHaveBeenCalledWith(STRONG_PASSWORD);
      expect(peopleService.updateInactiveSignup).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'João',
          cpf: '52998224725',
          passwordHash: 'hashed',
        }),
      );
      expect(emailService.sendVerificationCodeEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.email).toBe('a@b.com');
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

      await expect(
        service.verifyEmail('a@b.com', '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
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
      await expect(
        service.verifyEmail('a@b.com', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
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
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: false,
      } as never);
      await service.resendCode('a@b.com');
      expect(emailService.sendVerificationCodeEmail).toHaveBeenCalled();
    });

    it('aplica rate-limit quando o último código é recente', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: false,
      } as never);
      verificationRepo.findOne.mockResolvedValue({
        created_at: new Date(),
      });
      await expect(service.resendCode('a@b.com')).rejects.toThrow(/Aguarde/i);
      expect(emailService.sendVerificationCodeEmail).not.toHaveBeenCalled();
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
        id: 1,
        status: true,
        password: 'hashed',
        username: 'joao',
        public_id: 'pub-1',
        role: 'owner',
        cpf: '52998224725',
        terms_accepted_at: new Date(),
        companies: [],
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.signIn('a@b.com', STRONG_PASSWORD);
      expect(result).toEqual({
        access_token: 'jwt-token',
        needsProfileCompletion: false,
      });
      expect(peopleService.touchLastLoginAt).toHaveBeenCalledWith(1);
    });

    it('não pede complete-profile se já aceitou termos mesmo sem CPF', async () => {
      peopleService.findOneForAuth.mockResolvedValue({
        id: 1,
        status: true,
        password: 'hashed',
        username: 'joao',
        public_id: 'pub-1',
        role: 'owner',
        cpf: null,
        terms_accepted_at: new Date(),
        companies: [{ public_id: 'company-1', name: 'Arena' }],
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.signIn('a@b.com', STRONG_PASSWORD);
      expect(result.needsProfileCompletion).toBe(false);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ termsAccepted: true }),
      );
    });

    it('bloqueia login por senha em conta só-Google', async () => {
      peopleService.findOneForAuth.mockResolvedValue({
        id: 1,
        status: true,
        password: null,
        email: 'a@b.com',
        companies: [],
      } as never);

      await expect(service.signIn('a@b.com', STRONG_PASSWORD)).rejects.toThrow(
        /google/i,
      );
    });

    it('rejeita credenciais inválidas', async () => {
      peopleService.findOneForAuth.mockResolvedValue(null);
      await expect(service.signIn('a@b.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('inclui companyPublicId, role e updatedPassword no payload do JWT', async () => {
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      peopleService.findOneForAuth.mockResolvedValue({
        id: 1,
        status: true,
        password: 'hashed',
        username: 'joao',
        public_id: 'person-1',
        role: 'owner',
        cpf: '52998224725',
        terms_accepted_at: new Date(),
        companies: [{ public_id: 'company-1', name: 'Arena', plan_id: 1 }],
      } as never);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await service.signIn('a@b.com', STRONG_PASSWORD);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'person-1',
          companyPublicId: 'company-1',
          updatedPassword: true,
          role: 'owner',
          termsAccepted: true,
        }),
      );
    });
  });

  describe('googleAuth', () => {
    const googlePayload = {
      sub: 'google-sub-1',
      email: 'joao@gmail.com',
      email_verified: true,
      name: 'João Silva',
    };

    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      jest
        .spyOn(service as never, 'verifyGoogleIdToken' as never)
        .mockResolvedValue(googlePayload as never);
    });

    it('cria dono novo e emite JWT com needsProfileCompletion', async () => {
      peopleService.findByGoogleSub.mockResolvedValue(null);
      peopleService.findByEmail.mockResolvedValue(null);
      peopleService.createGoogleOwner.mockResolvedValue({
        id: 9,
        public_id: 'pub-g',
        username: 'joao',
        role: 'owner',
        password: null,
        cpf: null,
        terms_accepted_at: null,
        companies: [],
      } as never);

      const result = await service.googleAuth({ idToken: 'fake.jwt.token' });

      expect(peopleService.createGoogleOwner).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@gmail.com',
        googleSub: 'google-sub-1',
      });
      expect(result.access_token).toBe('jwt-token');
      expect(result.needsProfileCompletion).toBe(true);
    });

    it('exige senha para vincular conta ativa com senha local', async () => {
      peopleService.findByGoogleSub.mockResolvedValue(null);
      peopleService.findByEmail.mockResolvedValue({
        id: 3,
        status: true,
        password: 'hashed',
        google_sub: null,
        email: 'joao@gmail.com',
        companies: [],
      } as never);

      await expect(
        service.googleAuth({ idToken: 'fake.jwt.token' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'GOOGLE_LINK_REQUIRED' }),
      });
    });

    it('vincula Google quando a senha da conta existente confere', async () => {
      peopleService.findByGoogleSub.mockResolvedValue(null);
      peopleService.findByEmail.mockResolvedValue({
        id: 3,
        status: true,
        password: 'hashed',
        google_sub: null,
        email: 'joao@gmail.com',
        public_id: 'pub-3',
        username: 'joao',
        role: 'owner',
        cpf: '52998224725',
        terms_accepted_at: new Date(),
        companies: [],
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.googleAuth({
        idToken: 'fake.jwt.token',
        password: STRONG_PASSWORD,
      });

      expect(peopleService.linkGoogleSub).toHaveBeenCalledWith(
        3,
        'google-sub-1',
      );
      expect(result.needsProfileCompletion).toBe(false);
    });

    it('ativa conta pendente e vincula Google sem senha', async () => {
      peopleService.findByGoogleSub.mockResolvedValue(null);
      peopleService.findByEmail.mockResolvedValue({
        id: 4,
        status: false,
        password: 'hashed',
        google_sub: null,
        email: 'joao@gmail.com',
        public_id: 'pub-4',
        username: 'joao',
        role: 'owner',
        cpf: '52998224725',
        terms_accepted_at: new Date(),
        companies: [],
      } as never);

      const result = await service.googleAuth({ idToken: 'fake.jwt.token' });

      expect(peopleService.linkGoogleSub).toHaveBeenCalledWith(
        4,
        'google-sub-1',
      );
      expect(result.access_token).toBe('jwt-token');
    });
  });

  describe('changePassword', () => {
    it('altera senha do usuário autenticado quando ainda usa senha padrão', async () => {
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      peopleService.findOneByPublicIdForPasswordChange.mockResolvedValue({
        id: 7,
        password: 'old-hash',
        public_id: 'person-1',
      });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // is default
        .mockResolvedValueOnce(false) // new != current
        .mockResolvedValueOnce(false); // issueAuthToken: not default anymore
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      peopleService.updatePassword.mockResolvedValue({ message: 'Senha alterada' });
      peopleService.findByPublicIdWithCompanies.mockResolvedValue({
        id: 7,
        public_id: 'person-1',
        username: 'dono@arena.com',
        password: 'new-hash',
        role: 'owner',
        cpf: '52998224725',
        terms_accepted_at: new Date(),
        companies: [{ public_id: 'company-1', name: 'Arena' }],
      });

      const result = await service.changePassword('person-1', STRONG_PASSWORD);

      expect(peopleService.updatePassword).toHaveBeenCalledWith(7, 'new-hash');
      expect(result.access_token).toBe('jwt-token');
      expect(result.needsProfileCompletion).toBe(false);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'person-1',
          updatedPassword: true,
          companyPublicId: 'company-1',
        }),
      );
    });

    it('exige senha atual quando a conta já não usa a senha padrão', async () => {
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      peopleService.findOneByPublicIdForPasswordChange.mockResolvedValue({
        id: 7,
        password: 'old-hash',
        public_id: 'person-1',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false); // not default

      await expect(
        service.changePassword('person-1', STRONG_PASSWORD),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejeita senha atual inválida', async () => {
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      peopleService.findOneByPublicIdForPasswordChange.mockResolvedValue({
        id: 7,
        password: 'old-hash',
        public_id: 'person-1',
      });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false) // not default
        .mockResolvedValueOnce(false); // current wrong

      await expect(
        service.changePassword('person-1', STRONG_PASSWORD, 'errada'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita senha fraca', async () => {
      await expect(service.changePassword('person-1', '123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(peopleService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejeita personPublicId inexistente', async () => {
      peopleService.findOneByPublicIdForPasswordChange.mockResolvedValue(null);
      await expect(
        service.changePassword('missing', STRONG_PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita nova senha igual à atual (fluxo senha padrão)', async () => {
      process.env.DEFAULT_PASSWORD = 'bemvindo';
      peopleService.findOneByPublicIdForPasswordChange.mockResolvedValue({
        id: 7,
        password: 'old-hash',
        public_id: 'person-1',
      });
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // is default
        .mockResolvedValueOnce(true); // same as new

      await expect(
        service.changePassword('person-1', STRONG_PASSWORD),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('não revela inexistência e não envia quando e-mail não existe', async () => {
      peopleService.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('a@b.com');
      expect(emailService.sendPasswordResetCodeEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/se houver uma conta ativa/i);
    });

    it('não envia quando a conta ainda não confirmou o e-mail', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: false,
      } as never);
      const result = await service.forgotPassword('a@b.com');
      expect(emailService.sendPasswordResetCodeEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/se houver uma conta ativa/i);
    });

    it('envia código de recuperação para conta ativa', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: true,
        password: 'hashed',
      } as never);
      await service.forgotPassword('A@B.com');
      expect(verificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          person_id: 7,
          email: 'a@b.com',
          purpose: 'password_reset',
        }),
      );
      expect(emailService.sendPasswordResetCodeEmail).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
    });

    it('não envia para conta só-Google (sem senha local)', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: true,
        password: null,
      } as never);
      const result = await service.forgotPassword('a@b.com');
      expect(emailService.sendPasswordResetCodeEmail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/se houver uma conta ativa/i);
    });

    it('aplica rate-limit quando o último código de reset é recente', async () => {
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: true,
        password: 'hashed',
      } as never);
      verificationRepo.findOne.mockResolvedValue({
        created_at: new Date(),
      });
      await expect(service.forgotPassword('a@b.com')).rejects.toThrow(/Aguarde/i);
      expect(emailService.sendPasswordResetCodeEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('redefine a senha com código válido', async () => {
      verificationRepo.findOne.mockResolvedValue({
        person_id: 7,
        code: '123456',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        consumed_at: null,
      });
      peopleService.findByEmail.mockResolvedValue({
        id: 7,
        status: true,
        password: 'old-hash',
      } as never);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      peopleService.updatePassword.mockResolvedValue({ message: 'ok' });

      const result = await service.resetPassword(
        'a@b.com',
        '123456',
        STRONG_PASSWORD,
      );

      expect(peopleService.updatePassword).toHaveBeenCalledWith(7, 'new-hash');
      expect(result.message).toMatch(/redefinida/i);
    });

    it('rejeita código inválido', async () => {
      verificationRepo.findOne.mockResolvedValue({
        person_id: 7,
        code: '123456',
        expires_at: new Date(Date.now() + 60_000),
        attempts: 0,
        consumed_at: null,
      });
      await expect(
        service.resetPassword('a@b.com', '000000', STRONG_PASSWORD),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejeita senha fraca', async () => {
      await expect(
        service.resetPassword('a@b.com', '123456', '123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('completeProfile', () => {
    it('grava CPF e termos e emite JWT completo', async () => {
      peopleService.findByPublicIdWithCompanies
        .mockResolvedValueOnce({
          id: 9,
          public_id: 'pub-g',
          username: 'joao',
          role: 'owner',
          cpf: null,
          terms_accepted_at: null,
          companies: [],
        })
        .mockResolvedValueOnce({
          id: 9,
          public_id: 'pub-g',
          username: 'joao',
          role: 'owner',
          cpf: '52998224725',
          terms_accepted_at: new Date(),
          companies: [],
        });

      const result = await service.completeProfile('pub-g', {
        acceptedTerms: true,
        cpf: '529.982.247-25',
      });

      expect(peopleService.completeOwnerProfile).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ cpf: '52998224725' }),
      );
      expect(result.needsProfileCompletion).toBe(false);
    });

    it('libera cliente existente com termos mesmo sem CPF no payload', async () => {
      peopleService.findByPublicIdWithCompanies.mockResolvedValue({
        id: 2,
        public_id: 'pub-old',
        username: 'arena',
        role: 'owner',
        cpf: null,
        terms_accepted_at: new Date('2024-01-01'),
        companies: [{ public_id: 'company-1', name: 'Arena' }],
      } as never);

      const result = await service.completeProfile('pub-old', {});

      expect(peopleService.completeOwnerProfile).not.toHaveBeenCalled();
      expect(result.needsProfileCompletion).toBe(false);
    });

    it('recusa conta nova sem CPF', async () => {
      peopleService.findByPublicIdWithCompanies.mockResolvedValue({
        id: 9,
        public_id: 'pub-g',
        username: 'joao',
        role: 'owner',
        cpf: null,
        terms_accepted_at: null,
        companies: [],
      } as never);

      await expect(
        service.completeProfile('pub-g', { acceptedTerms: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(peopleService.completeOwnerProfile).not.toHaveBeenCalled();
    });
  });
});
