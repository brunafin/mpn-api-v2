import { ForbiddenException } from '@nestjs/common';
import { PlatformPortalGuard } from './platform-portal.guard';
import { PersonRole } from 'src/people/enums/person-role.enum';

describe('PlatformPortalGuard', () => {
  const guard = new PlatformPortalGuard();

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
        ctx({
          userId: '1',
          role: PersonRole.PLATFORM_ADMIN,
          companyPublicId: null,
        }),
      ),
    ).toBe(true);
  });

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

  it('bloqueia owner', () => {
    expect(() =>
      guard.canActivate(
        ctx({ userId: '1', role: PersonRole.OWNER, companyPublicId: 'c1' }),
      ),
    ).toThrow(ForbiddenException);
  });
});
