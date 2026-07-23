import { ForbiddenException } from '@nestjs/common';
import { assertAdministratorOwns } from './assert-administrator-owns';

describe('assertAdministratorOwns', () => {
  it('permite quando o administrador é o caller', () => {
    expect(() =>
      assertAdministratorOwns('owner-a', 'owner-a'),
    ).not.toThrow();
  });

  it('bloqueia cross-tenant', () => {
    expect(() => assertAdministratorOwns('owner-a', 'owner-b')).toThrow(
      ForbiddenException,
    );
  });

  it('bloqueia quando não há administrador', () => {
    expect(() => assertAdministratorOwns(undefined, 'owner-a')).toThrow(
      ForbiddenException,
    );
  });
});
