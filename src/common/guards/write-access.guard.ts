import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { Company } from 'src/companies/entities/company.entity';
import { TrialExpiryService } from 'src/companies/trial-expiry.service';
import {
  canMutateCompany,
  hasProductEntitlement,
} from 'src/companies/utils/company-access';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { Repository } from 'typeorm';

/**
 * Bloqueia writes do owner quando a company não tem entitlement
 * ou está em access_mode=read_only. Platform admin passa.
 */
@Injectable()
export class WriteAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly trialExpiryService: TrialExpiryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtAuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (user.role === PersonRole.PLATFORM_ADMIN) {
      return true;
    }

    if (!user.companyPublicId) {
      throw new ForbiddenException({
        message: 'Estabelecimento sem plano ativo.',
        code: 'PRODUCT_INACTIVE',
      });
    }

    const company = await this.companyRepository.findOne({
      where: { public_id: user.companyPublicId },
      select: [
        'id',
        'public_id',
        'partner_status',
        'plan_id',
        'is_trial',
        'trial_ends_at',
        'access_mode',
      ],
    });

    if (!company) {
      throw new ForbiddenException({
        message: 'Estabelecimento não encontrado.',
        code: 'PRODUCT_INACTIVE',
      });
    }

    await this.trialExpiryService.expireCompanyIfNeeded(company);

    if (!hasProductEntitlement(company)) {
      throw new ForbiddenException({
        message:
          'Seu período de teste expirou. Contrate um plano para continuar usando a agenda.',
        code: 'PRODUCT_INACTIVE',
      });
    }

    if (!canMutateCompany(company)) {
      throw new ForbiddenException({
        message:
          'Sua conta está em modo somente leitura. Regularize a pendência para editar a agenda.',
        code: 'ACCOUNT_READ_ONLY',
      });
    }

    return true;
  }
}
