import { QueryFailedError } from 'typeorm';
import { isPgUniqueViolation } from './pg-error';

describe('isPgUniqueViolation', () => {
  it('reconhece QueryFailedError 23505', () => {
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    expect(
      isPgUniqueViolation(new QueryFailedError('INSERT', [], driverError)),
    ).toBe(true);
  });

  it('reconhece erro com code 23505 direto', () => {
    expect(
      isPgUniqueViolation(Object.assign(new Error('dup'), { code: '23505' })),
    ).toBe(true);
  });

  it('ignora outros erros', () => {
    expect(isPgUniqueViolation(new Error('boom'))).toBe(false);
    expect(
      isPgUniqueViolation(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('fk'), { code: '23503' }),
        ),
      ),
    ).toBe(false);
    expect(isPgUniqueViolation(null)).toBe(false);
  });
});
