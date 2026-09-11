import { ForbiddenException } from '@nestjs/common';
import { RepresentativeGuard } from './representative.guard';
import { PersonRole } from 'src/people/enums/person-role.enum';

describe('RepresentativeGuard', () => {
  const guard = new RepresentativeGuard();

  function ctx(user: unknown) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('permite representative', () => {
    expect(
      guard.canActivate(
        ctx({
          userId: '1',
          role: PersonRole.REPRESENTATIVE,
          companyPublicId: null,
        }),
      ),
    ).toBe(true);
  });

  it('bloqueia platform_admin', () => {
    expect(() =>
      guard.canActivate(
        ctx({
          userId: '1',
          role: PersonRole.PLATFORM_ADMIN,
          companyPublicId: null,
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('bloqueia owner', () => {
    expect(() =>
      guard.canActivate(
        ctx({ userId: '1', role: PersonRole.OWNER, companyPublicId: 'c1' }),
      ),
    ).toThrow(ForbiddenException);
  });
});
