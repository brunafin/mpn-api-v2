import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PersonRole } from 'src/people/enums/person-role.enum';

export type JwtAuthUser = {
  userId: string;
  username?: string;
  companyPublicId: string | null;
  role: PersonRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET_MANAGER_LOGIN) {
      throw new Error('JWT_SECRET_MANAGER_LOGIN não configurado no ambiente.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET_MANAGER_LOGIN,
    });
  }

  async validate(payload: {
    sub: string;
    username?: string;
    companyPublicId?: string | null;
    role?: PersonRole;
  }): Promise<JwtAuthUser> {
    return {
      userId: payload.sub,
      username: payload.username,
      companyPublicId: payload.companyPublicId ?? null,
      role: payload.role === PersonRole.PLATFORM_ADMIN
        ? PersonRole.PLATFORM_ADMIN
        : PersonRole.OWNER,
    };
  }
}
