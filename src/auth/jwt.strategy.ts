import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PersonRole } from 'src/people/enums/person-role.enum';
import { PeopleService } from 'src/people/people.service';

export type JwtAuthUser = {
  userId: string;
  username?: string;
  companyPublicId: string | null;
  role: PersonRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly peopleService: PeopleService) {
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
    if (!payload?.sub) {
      throw new UnauthorizedException('Acesso expirado');
    }

    const person = await this.peopleService.findByPublicIdForJwt(payload.sub);
    if (!person || person.status === false) {
      throw new UnauthorizedException('Acesso expirado');
    }

    return {
      userId: person.public_id,
      username: person.username,
      companyPublicId: payload.companyPublicId ?? null,
      role:
        person.role === PersonRole.PLATFORM_ADMIN
          ? PersonRole.PLATFORM_ADMIN
          : PersonRole.OWNER,
    };
  }
}
