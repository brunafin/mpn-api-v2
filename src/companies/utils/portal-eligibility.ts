import {
  FindOptionsWhere,
  IsNull,
  Not,
  ObjectLiteral,
  Raw,
  SelectQueryBuilder,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';

/**
 * Trial vencido ainda com flag ligada não entra no portal.
 * O callback do Raw recebe o alias da coluna is_trial (ex. "company"."is_trial").
 */
export const NOT_STALE_TRIAL = Raw(
  (alias) =>
    `(${alias} = false OR ${alias.replace(/is_trial/g, 'trial_ends_at')} > NOW())`,
);

export function portalCompanyWhere(
  extra: FindOptionsWhere<Company> = {},
): FindOptionsWhere<Company> {
  return {
    is_active: true,
    partner_status: PartnerStatus.ACTIVE,
    plan_id: Not(IsNull()),
    access_mode: AccessMode.FULL,
    ...extra,
    is_trial: NOT_STALE_TRIAL,
  };
}

export function andWhereNotStaleTrial<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias = 'company',
): SelectQueryBuilder<T> {
  return qb.andWhere(
    `(${alias}.is_trial = false OR ${alias}.trial_ends_at > NOW())`,
  );
}
