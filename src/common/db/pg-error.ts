import { QueryFailedError } from 'typeorm';

/** Violação de unique/exclusion no PostgreSQL (`23505`). */
export function isPgUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const fromDriver =
    error instanceof QueryFailedError
      ? driverCode(error.driverError)
      : null;
  const fromSelf = driverCode(error);

  return fromDriver === '23505' || fromSelf === '23505';
}

function driverCode(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('code' in value)) {
    return null;
  }
  const code = (value as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
