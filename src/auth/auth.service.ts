import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PeopleService } from '../people/people.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PlanEnum } from 'src/plans/enum/enum';
import { EmailService } from 'src/email/email.service';
import { isValidPassword, PASSWORD_HINT } from 'src/utils/passwordPolicy';
import { EmailVerification } from './entities/email-verification.entity';
import { SignupDto } from './dto/signup.dto';

const CODE_TTL_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
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
      throw new UnauthorizedException(
        'Confirme seu e-mail antes de entrar. Verifique o código enviado para o seu e-mail.',
      );
    }

    const company = user.companies?.[0];
    const isPendence = company?.plan_id === PlanEnum.PENDENCE;
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

    const payload = {
      sub: user.public_id,
      username: user.username,
      companyPublicId: company?.public_id ?? null,
      companyName: company?.name ?? null,
      updatedPassword: !isDefaultPassword,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
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
      throw new ConflictException('Já existe uma conta com este e-mail.');
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
      message: 'Cadastro criado. Enviamos um código de confirmação para o seu e-mail.',
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

    await this.issueVerificationCode(person.id, email);
    return {
      message:
        'Se houver um cadastro pendente para este e-mail, enviamos um novo código.',
    };
  }

  async changePassword(
    companyPublicId: string,
    newPassword: string,
  ): Promise<any> {
    if (!isValidPassword(newPassword)) {
      throw new Error(PASSWORD_HINT);
    }

    const user =
      await this.peopleService.findOneByCompanyPublicId(companyPublicId);
    if (!user) {
      throw new UnauthorizedException('Não autorizado.');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('A nova senha não pode ser igual à senha atual.');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.peopleService.updatePassword(user.id, hashed);
    return { message: 'Senha alterada com sucesso.' };
  }
}
