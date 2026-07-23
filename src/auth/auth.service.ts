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
import { PlanEnum } from 'src/plans/enum/enum';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { EmailService } from 'src/email/email.service';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';
import { EmailVerification } from './entities/email-verification.entity';
import { SignupDto } from './dto/signup.dto';

const CODE_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

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

    const isExpired =
      role !== PersonRole.PLATFORM_ADMIN &&
      company?.partner_status === PartnerStatus.EXPIRED;
    if (isExpired) {
      throw new UnauthorizedException(
        'Seu período de teste expirou. Entre em contato para contratar um plano. WhatsApp (51)989589197',
      );
    }

    const isPendence =
      role !== PersonRole.PLATFORM_ADMIN &&
      company?.plan_id === PlanEnum.PENDENCE;
    if (isPendence) {
      throw new UnauthorizedException(
        'Sua conta está com pendência. Por favor, regularize sua situação para continuar utilizando nossos serviços. WhatsApp para contato (51)989589197',
      );
    }

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
      { partner_status: PartnerStatus.EXPIRED, plan_id: null },
    );
    company.partner_status = PartnerStatus.EXPIRED;
    company.plan_id = null;
  }

  private generateCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Rate-limit no servidor: impede reenviar um novo código antes de esgotar o
   * cooldown, medido a partir do último código emitido para o dono. Evita spam
   * de e-mails mesmo que o cooldown do cliente seja burlado.
   */
  private async assertResendAllowed(personId: number): Promise<void> {
    const last = await this.emailVerificationRepository.findOne({
      where: { person_id: personId },
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

  private async issueVerificationCode(
    personId: number,
    email: string,
  ): Promise<string> {
    // Invalida códigos anteriores ainda não consumidos deste dono.
    await this.emailVerificationRepository.update(
      { person_id: personId, consumed_at: IsNull() },
      { consumed_at: new Date() },
    );

    const code = this.generateCode();
    const expires_at = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await this.emailVerificationRepository.save(
      this.emailVerificationRepository.create({
        person_id: personId,
        email,
        code,
        expires_at,
        attempts: 0,
      }),
    );

    await this.emailService.sendVerificationCodeEmail(email, code);
    return code;
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
      await this.assertResendAllowed(existing.id);
      await this.issueVerificationCode(existing.id, email);
      return {
        message:
          'Já havia um cadastro pendente para este e-mail. Enviamos um novo código de confirmação.',
        email,
      };
    }

    const passwordHash = await this.peopleService.hashPassword(dto.password);
    const person = await this.peopleService.createInactiveOwner({
      name,
      email,
      phone: dto.phone?.replace(/\D/g, '') || undefined,
      passwordHash,
    });

    await this.issueVerificationCode(person.id, email);

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
    const verification = await this.emailVerificationRepository.findOne({
      where: { email, consumed_at: IsNull() },
      order: { created_at: 'DESC' },
    });

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

    verification.consumed_at = new Date();
    await this.emailVerificationRepository.save(verification);
    await this.peopleService.activate(verification.person_id);

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

    await this.assertResendAllowed(person.id);
    await this.issueVerificationCode(person.id, email);
    return {
      message:
        'Se houver um cadastro pendente para este e-mail, enviamos um novo código.',
    };
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
