import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PeopleService } from '../people/people.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private peopleService: PeopleService,
    private jwtService: JwtService
  ) { }

  async signIn(username: string, pass: string): Promise<any> {
    const user = await this.peopleService.findOneByUsername(username);

    if (!user) {
      throw new UnauthorizedException(
        'Acesso inválido. Por favor, verifique suas credenciais ou contate a nossa equipe.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException(
        'Acesso inválido. Por favor, verifique suas credenciais ou contate a nossa equipe.',
      );
    }
    const payload = { sub: user.public_id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
