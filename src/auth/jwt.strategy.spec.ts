import { UnauthorizedException } from '@nestjs/common';
import { PersonRole } from 'src/people/enums/person-role.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const originalSecret = process.env.JWT_SECRET_MANAGER_LOGIN;

  beforeAll(() => {
    process.env.JWT_SECRET_MANAGER_LOGIN = 'test-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET_MANAGER_LOGIN;
    } else {
      process.env.JWT_SECRET_MANAGER_LOGIN = originalSecret;
    }
  });

  function strategy(
    person: {
      id?: number;
      public_id: string;
      username: string;
      status: boolean;
      role: PersonRole;
    } | null,
  ) {
    return new JwtStrategy({
      findByPublicIdForJwt: jest.fn().mockResolvedValue(
        person ? { id: person.id ?? 1, ...person } : null,
      ),
      touchLastLoginAtIfStale: jest.fn().mockResolvedValue(undefined),
    } as never);
  }

  it('usa role do DB mesmo se o JWT disser platform_admin', async () => {
    const user = await strategy({
      public_id: 'u1',
      username: 'dono',
      status: true,
      role: PersonRole.OWNER,
    }).validate({
      sub: 'u1',
      role: PersonRole.PLATFORM_ADMIN,
      companyPublicId: 'c1',
    });

    expect(user.role).toBe(PersonRole.OWNER);
    expect(user.userId).toBe('u1');
    expect(user.companyPublicId).toBe('c1');
  });

  it('permite platform_admin quando o DB confirma', async () => {
    const user = await strategy({
      public_id: 'admin',
      username: 'admin',
      status: true,
      role: PersonRole.PLATFORM_ADMIN,
    }).validate({
      sub: 'admin',
      role: PersonRole.OWNER,
    });

    expect(user.role).toBe(PersonRole.PLATFORM_ADMIN);
  });

  it('rejeita person inexistente', async () => {
    await expect(strategy(null).validate({ sub: 'missing' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita conta inativa', async () => {
    await expect(
      strategy({
        public_id: 'u1',
        username: 'dono',
        status: false,
        role: PersonRole.PLATFORM_ADMIN,
      }).validate({
        sub: 'u1',
        role: PersonRole.PLATFORM_ADMIN,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
