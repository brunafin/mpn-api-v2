import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { PeopleService } from '../people/people.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Company } from 'src/companies/entities/company.entity';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { shouldExpireTrialCompany } from 'src/companies/utils/trial-expiry';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { Person } from 'src/people/entities/person.entity';
import { EmailService } from 'src/email/email.service';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';
import { normalizeCpf } from 'src/utils/normalize-cpf';
import { EmailVerification } from './entities/email-verification.entity';
import { EmailVerificationPurpose } from './enums/email-verification-purpose.enum';
import {
  CompleteProfileDto,
  GoogleAuthDto,
  SignupDto,
} from './dto/signup.dto';

const CODE_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'Se houver uma conta ativa com este e-mail, enviamos um código para redefinir a senha.';

type AuthTokenResult = {
  access_token: string;
  needsProfileCompletion: boolean;
};

function readGoogleClientId(): string | undefined {
  const raw = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!raw) return undefined;
  // Railway/dotenv às vezes gravam com aspas literais.
  return raw.replace(/^['"]|['"]$/g, '').trim() || undefined;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly peopleService: PeopleService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {
    this.googleClient = new OAuth2Client();
  }

  async signIn(username: string, pass: string): Promise<AuthTokenResult> {
    const user = await this.peopleService.findOneForAuth(username);

    if (!user) {
      throw new UnauthorizedException(
        'Acesso inválido. Por favor, verifique suas credenciais ou contate a nossa equipe.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Esta conta usa login com Google. Clique em Continuar com Google.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException(
        'Acesso inválido. Por favor, verifique suas credenciais ou contate a nossa equipe.',
      );
    }

    if (!user.status) {
      throw new UnauthorizedException({
        message:
          'Confirme seu e-mail antes de entrar. Verifique o código enviado para o seu e-mail.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    return this.issueAuthToken({
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      public_id: user.public_id,
      status: user.status,
      role: user.role,
      cpf: user.cpf,
      terms_accepted_at: user.terms_accepted_at,
      companies: user.companies,
    } as Person);
  }

  async googleAuth(dto: GoogleAuthDto): Promise<AuthTokenResult> {
    const payload = await this.verifyGoogleIdToken(dto.idToken);
    const email = this.normalizeEmail(payload.email);
    const googleSub = payload.sub;
    const name = (payload.name?.trim() || email.split('@')[0]).slice(0, 50);

    const bySub = await this.peopleService.findByGoogleSub(googleSub);
    if (bySub) {
      if (!bySub.status) {
        await this.peopleService.activate(bySub.id);
        bySub.status = true;
      }
      return this.issueAuthToken(bySub);
    }

    const existing = await this.peopleService.findByEmail(email);

    if (!existing) {
      const person = await this.peopleService.createGoogleOwner({
        name,
        email,
        googleSub,
      });
      return this.issueAuthToken(person);
    }

    if (existing.google_sub && existing.google_sub !== googleSub) {
      throw new ConflictException(
        'Este e-mail já está vinculado a outra conta Google.',
      );
    }

    // Conta pendente (código não confirmado): ativa e vincula Google.
    if (!existing.status) {
      await this.peopleService.linkGoogleSub(existing.id, googleSub);
      existing.google_sub = googleSub;
      existing.status = true;
      return this.issueAuthToken(existing);
    }

    // Já vinculada (mesmo sub) — coberto pelo findByGoogleSub; aqui falta vincular.
    if (existing.password) {
      if (!dto.password) {
        throw new UnauthorizedException({
          message:
            'Já existe uma conta com este e-mail. Informe a senha para vincular o Google.',
          code: 'GOOGLE_LINK_REQUIRED',
          email,
        });
      }
      const passwordOk = await bcrypt.compare(dto.password, existing.password);
      if (!passwordOk) {
        throw new UnauthorizedException('Senha inválida.');
      }
    }

    await this.peopleService.linkGoogleSub(existing.id, googleSub);
    existing.google_sub = googleSub;
    return this.issueAuthToken(existing);
  }

  async completeProfile(
    personPublicId: string,
    dto: CompleteProfileDto,
  ): Promise<AuthTokenResult> {
    const person =
      await this.peopleService.findByPublicIdWithCompanies(personPublicId);
    if (!person) {
      throw new UnauthorizedException('Não autorizado.');
    }

    const phoneDigits = dto.phone?.replace(/\D/g, '') || undefined;
    await this.peopleService.completeOwnerProfile(person.id, {
      phone: phoneDigits,
      termsAcceptedAt: new Date(),
    });

    const refreshed =
      await this.peopleService.findByPublicIdWithCompanies(personPublicId);
    if (!refreshed) {
      throw new UnauthorizedException('Não autorizado.');
    }
    return this.issueAuthToken(refreshed);
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    sub: string;
    email: string;
    email_verified?: boolean;
    name?: string;
  }> {
    const clientId = readGoogleClientId();
    if (!clientId) {
      throw new HttpException(
        'Login com Google não está configurado.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Google verifyIdToken falhou: ${detail}`);
      throw new UnauthorizedException('Token Google inválido.');
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token Google incompleto.');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException(
        'O e-mail da conta Google ainda não está verificado.',
      );
    }

    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      name: payload.name,
    };
  }

  private needsProfileCompletion(person: Person): boolean {
    return !person.terms_accepted_at;
  }

  private async issueAuthToken(person: Person): Promise<AuthTokenResult> {
    const company = person.companies?.[0];
    const role =
      person.role === PersonRole.PLATFORM_ADMIN
        ? PersonRole.PLATFORM_ADMIN
        : PersonRole.OWNER;

    if (role !== PersonRole.PLATFORM_ADMIN && company) {
      await this.expireTrialIfNeeded(company);
    }

    let updatedPassword = true;
    if (person.password) {
      const defaultPassword = process.env.DEFAULT_PASSWORD;
      if (!defaultPassword) {
        throw new Error(
          'A variável de ambiente DEFAULT_PASSWORD não está definida.',
        );
      }
      const isDefaultPassword = await bcrypt.compare(
        defaultPassword,
        person.password,
      );
      updatedPassword = !isDefaultPassword;
    }

    await this.peopleService.touchLastLoginAt(person.id);

    const needsProfileCompletion = this.needsProfileCompletion(person);

    const payload = {
      sub: person.public_id,
      username: person.username,
      companyPublicId: company?.public_id ?? null,
      companyName: company?.name ?? null,
      updatedPassword,
      role,
      termsAccepted: !needsProfileCompletion,
    };

    return {
      access_token: this.jwtService.sign(payload),
      needsProfileCompletion,
    };
  }

  private async expireTrialIfNeeded(company: Company): Promise<void> {
    if (!shouldExpireTrialCompany(company)) return;
    await this.companyRepository.update(
      { id: company.id },
      {
        partner_status: PartnerStatus.EXPIRED,
        plan_id: null,
        is_trial: false,
      },
    );
    company.partner_status = PartnerStatus.EXPIRED;
    company.plan_id = null;
    company.is_trial = false;
  }

  private generateCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Rate-limit no servidor: impede reenviar um novo código antes de esgotar o
   * cooldown, medido a partir do último código emitido para o dono + finalidade.
   */
  private async assertResendAllowed(
    personId: number,
    purpose: EmailVerificationPurpose,
  ): Promise<void> {
    const last = await this.emailVerificationRepository.findOne({
      where: { person_id: personId, purpose },
      order: { created_at: 'DESC' },
    });
    if (!last) return;

    const elapsedMs = Date.now() - new Date(last.created_at).getTime();
    const remainingMs = RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
    if (remainingMs > 0) {
      throw new HttpException(
        `Aguarde ${Math.ceil(remainingMs / 1000)}s para reenviar o código.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async issueCode(
    personId: number,
    email: string,
    purpose: EmailVerificationPurpose,
  ): Promise<string> {
    await this.emailVerificationRepository.update(
      { person_id: personId, purpose, consumed_at: IsNull() },
      { consumed_at: new Date() },
    );

    const code = this.generateCode();
    const expires_at = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await this.emailVerificationRepository.save(
      this.emailVerificationRepository.create({
        person_id: personId,
        email,
        code,
        purpose,
        expires_at,
        attempts: 0,
      }),
    );

    if (purpose === EmailVerificationPurpose.PASSWORD_RESET) {
      await this.emailService.sendPasswordResetCodeEmail(email, code);
    } else {
      await this.emailService.sendVerificationCodeEmail(email, code);
    }
    return code;
  }

  private async findPendingCode(
    email: string,
    purpose: EmailVerificationPurpose,
  ): Promise<EmailVerification | null> {
    return this.emailVerificationRepository.findOne({
      where: { email, purpose, consumed_at: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  private async assertValidPendingCode(
    verification: EmailVerification | null,
    code: string,
  ): Promise<EmailVerification> {
    if (!verification) {
      throw new BadRequestException(
        'Nenhum código pendente para este e-mail. Solicite um novo código.',
      );
    }

    if (new Date() > verification.expires_at) {
      throw new BadRequestException(
        'Código expirado. Solicite um novo código.',
      );
    }

    if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException(
        'Número máximo de tentativas excedido. Solicite um novo código.',
      );
    }

    if (verification.code !== code?.trim()) {
      verification.attempts += 1;
      await this.emailVerificationRepository.save(verification);
      throw new BadRequestException('Código inválido. Tente novamente.');
    }

    return verification;
  }

  async signup(dto: SignupDto): Promise<{ message: string; email: string }> {
    const name = dto.name?.trim();
    const email = this.normalizeEmail(dto.email ?? '');

    if (!name || !email) {
      throw new BadRequestException('Nome e e-mail são obrigatórios.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Informe um e-mail válido.');
    }
    if (!isValidPassword(dto.password)) {
      throw new BadRequestException(PASSWORD_HINT);
    }

    const cpf = normalizeCpf(dto.cpf);
    if (!cpf) {
      throw new BadRequestException('Informe um CPF válido com 11 dígitos.');
    }

    const existing = await this.peopleService.findByEmail(email);
    if (existing) {
      if (existing.status) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }

      const existingCpf = await this.peopleService.findByCpf(cpf);
      if (existingCpf && existingCpf.id !== existing.id) {
        throw new ConflictException('Já existe uma conta com este CPF.');
      }

      const passwordHash = await this.peopleService.hashPassword(dto.password);
      await this.peopleService.updateInactiveSignup(existing.id, {
        name,
        phone: dto.phone?.replace(/\D/g, '') || undefined,
        cpf,
        passwordHash,
        termsAcceptedAt: new Date(),
      });

      await this.assertResendAllowed(
        existing.id,
        EmailVerificationPurpose.EMAIL_VERIFICATION,
      );
      await this.issueCode(
        existing.id,
        email,
        EmailVerificationPurpose.EMAIL_VERIFICATION,
      );
      return {
        message:
          'Já havia um cadastro pendente para este e-mail. Enviamos um novo código de confirmação.',
        email,
      };
    }

    const existingCpf = await this.peopleService.findByCpf(cpf);
    if (existingCpf) {
      throw new ConflictException('Já existe uma conta com este CPF.');
    }

    const passwordHash = await this.peopleService.hashPassword(dto.password);
    const person = await this.peopleService.createInactiveOwner({
      name,
      email,
      phone: dto.phone?.replace(/\D/g, '') || undefined,
      cpf,
      passwordHash,
      termsAcceptedAt: new Date(),
    });

    await this.issueCode(
      person.id,
      email,
      EmailVerificationPurpose.EMAIL_VERIFICATION,
    );

    return {
      message:
        'Cadastro criado. Enviamos um código de confirmação para o seu e-mail.',
      email,
    };
  }

  async verifyEmail(
    rawEmail: string,
    code: string,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(rawEmail ?? '');
    const verification = await this.findPendingCode(
      email,
      EmailVerificationPurpose.EMAIL_VERIFICATION,
    );
    const valid = await this.assertValidPendingCode(verification, code);

    valid.consumed_at = new Date();
    await this.emailVerificationRepository.save(valid);
    await this.peopleService.activate(valid.person_id);

    return { message: 'E-mail confirmado com sucesso.' };
  }

  async resendCode(rawEmail: string): Promise<{ message: string }> {
    const email = this.normalizeEmail(rawEmail ?? '');
    const person = await this.peopleService.findByEmail(email);

    // Resposta genérica para não revelar se o e-mail existe.
    if (!person || person.status) {
      return {
        message:
          'Se houver um cadastro pendente para este e-mail, enviamos um novo código.',
      };
    }

    await this.assertResendAllowed(
      person.id,
      EmailVerificationPurpose.EMAIL_VERIFICATION,
    );
    await this.issueCode(
      person.id,
      email,
      EmailVerificationPurpose.EMAIL_VERIFICATION,
    );
    return {
      message:
        'Se houver um cadastro pendente para este e-mail, enviamos um novo código.',
    };
  }

  async forgotPassword(rawEmail: string): Promise<{ message: string }> {
    const email = this.normalizeEmail(rawEmail ?? '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Informe um e-mail válido.');
    }

    const person = await this.peopleService.findByEmail(email);

    // Resposta genérica: não revela se o e-mail existe ou se a conta está ativa.
    // Contas só-Google (sem senha local) também não recebem código.
    if (!person || !person.status || !person.password) {
      return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    await this.assertResendAllowed(
      person.id,
      EmailVerificationPurpose.PASSWORD_RESET,
    );
    await this.issueCode(
      person.id,
      email,
      EmailVerificationPurpose.PASSWORD_RESET,
    );
    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  }

  async resetPassword(
    rawEmail: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!isValidPassword(newPassword)) {
      throw new BadRequestException(PASSWORD_HINT);
    }

    const email = this.normalizeEmail(rawEmail ?? '');
    const verification = await this.findPendingCode(
      email,
      EmailVerificationPurpose.PASSWORD_RESET,
    );
    const valid = await this.assertValidPendingCode(verification, code);

    const person = await this.peopleService.findByEmail(email);
    if (!person || !person.status || person.id !== valid.person_id) {
      throw new BadRequestException(
        'Não foi possível redefinir a senha. Solicite um novo código.',
      );
    }

    if (person.password) {
      const isSamePassword = await bcrypt.compare(newPassword, person.password);
      if (isSamePassword) {
        throw new BadRequestException(
          'A nova senha não pode ser igual à senha atual.',
        );
      }
    }

    valid.consumed_at = new Date();
    await this.emailVerificationRepository.save(valid);

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.peopleService.updatePassword(person.id, hashed);

    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  async changePassword(
    personPublicId: string,
    newPassword: string,
    currentPassword?: string,
  ): Promise<AuthTokenResult> {
    if (!isValidPassword(newPassword)) {
      throw new BadRequestException(PASSWORD_HINT);
    }

    const user =
      await this.peopleService.findOneByPublicIdForPasswordChange(
        personPublicId,
      );
    if (!user) {
      throw new UnauthorizedException('Não autorizado.');
    }

    // Conta só-Google (sem senha): permite definir senha sem senha atual.
    if (!user.password) {
      const hashed = await bcrypt.hash(newPassword, 12);
      await this.peopleService.updatePassword(user.id, hashed);
      return this.issueTokenAfterPasswordChange(personPublicId);
    }

    const defaultPassword = process.env.DEFAULT_PASSWORD;
    const isDefaultPassword = defaultPassword
      ? await bcrypt.compare(defaultPassword, user.password)
      : false;

    if (!isDefaultPassword) {
      if (!currentPassword) {
        throw new BadRequestException('Informe a senha atual.');
      }
      const currentOk = await bcrypt.compare(currentPassword, user.password);
      if (!currentOk) {
        throw new UnauthorizedException('Senha atual inválida.');
      }
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'A nova senha não pode ser igual à senha atual.',
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.peopleService.updatePassword(user.id, hashed);
    return this.issueTokenAfterPasswordChange(personPublicId);
  }

  /** JWT fresco com updatedPassword:true — evita preso em /alterar-senha. */
  private async issueTokenAfterPasswordChange(
    personPublicId: string,
  ): Promise<AuthTokenResult> {
    const refreshed =
      await this.peopleService.findByPublicIdWithCompanies(personPublicId);
    if (!refreshed) {
      throw new UnauthorizedException('Não autorizado.');
    }
    return this.issueAuthToken(refreshed);
  }
}
