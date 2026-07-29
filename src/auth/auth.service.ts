import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { PeopleService } from '../people/people.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Company } from 'src/companies/entities/company.entity';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { shouldExpireTrialCompany } from 'src/companies/utils/trial-expiry';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { EmailService } from 'src/email/email.service';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';
import { normalizeCpf } from 'src/utils/normalize-cpf';
import { EmailVerification } from './entities/email-verification.entity';
import { EmailVerificationPurpose } from './enums/email-verification-purpose.enum';
import { SignupDto } from './dto/signup.dto';

const CODE_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'Se houver uma conta ativa com este e-mail, enviamos um código para redefinir a senha.';

@Injectable()
export class AuthService {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.peopleService.findOneForAuth(username);

    if (!user) {
      throw new UnauthorizedException(
        'Acesso inválido. Por favor, verifique suas credenciais ou contate a nossa equipe.',
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

    const company = user.companies?.[0];
    const role =
      user.role === PersonRole.PLATFORM_ADMIN
        ? PersonRole.PLATFORM_ADMIN
        : PersonRole.OWNER;

    if (role !== PersonRole.PLATFORM_ADMIN && company) {
      await this.expireTrialIfNeeded(company);
    }

    // Trial expirado e restrição read_only não bloqueiam login:
    // o manager decide via capabilities (CTA / somente leitura).

    const defaultPassword = process.env.DEFAULT_PASSWORD;
    if (!defaultPassword) {
      throw new Error(
        'A variável de ambiente DEFAULT_PASSWORD não está definida.',
      );
    }
    const isDefaultPassword = await bcrypt.compare(
      defaultPassword,
      user.password,
    );

    await this.peopleService.touchLastLoginAt(user.id);

    const payload = {
      sub: user.public_id,
      username: user.username,
      companyPublicId: company?.public_id ?? null,
      companyName: company?.name ?? null,
      updatedPassword: !isDefaultPassword,
      role,
    };
    return {
      access_token: this.jwtService.sign(payload),
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

    const existing = await this.peopleService.findByEmail(email);
    if (existing) {
      // Conta já ativa: e-mail realmente em uso.
      if (existing.status) {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }

      // Conta pendente (não verificada): retoma o cadastro reenviando o código
      // em vez de travar o usuário num 409 sem saída.
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

    const cpf = normalizeCpf(dto.cpf);
    if (!cpf) {
      throw new BadRequestException('Informe um CPF válido com 11 dígitos.');
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
    if (!person || !person.status) {
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

    const isSamePassword = await bcrypt.compare(newPassword, person.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'A nova senha não pode ser igual à senha atual.',
      );
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
  ): Promise<{ message: string }> {
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
    return { message: 'Senha alterada com sucesso.' };
  }
}
