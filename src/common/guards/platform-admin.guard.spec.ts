import { ForbiddenException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PersonRole } from 'src/people/enums/person-role.enum';

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  function ctx(user: unknown) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  it('permite platform_admin', () => {
    expect(
      guard.canActivate(
        ctx({ userId: '1', role: PersonRole.PLATFORM_ADMIN, companyPublicId: null }),
      ),
    ).toBe(true);
  });

  it('bloqueia owner', () => {
    expect(() =>
      guard.canActivate(
        ctx({ userId: '1', role: PersonRole.OWNER, companyPublicId: 'c1' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('bloqueia ausência de user', () => {
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
