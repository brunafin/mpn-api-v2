import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PeopleService } from '../people/people.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly peopleService: PeopleService,
    private readonly jwtService: JwtService
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
    const defaultPassword = process.env.DEFAULT_PASSWORD;
    if (!defaultPassword) {
      throw new Error('A variável de ambiente DEFAULT_PASSWORD não está definida.');
    }
    const isDefaultPassword = await bcrypt.compare(defaultPassword, user.password);

    const payload = {
      sub: user.public_id,
      username: user.username,
      companyPublicId: user?.companies.length > 0 ? user.companies[0].public_id : null,
      companyName: user?.companies.length > 0 ? user.companies[0].name : null,
      updatedPassword: !isDefaultPassword,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(companyPublicId: string, newPassword: string): Promise<any> {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
      throw new Error(
        'A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.'
      );
    }

    const user = await this.peopleService.findOneByCompanyPublicId(companyPublicId);
    if (!user) {
      throw new UnauthorizedException('Não autorizado.');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error('A nova senha não pode ser igual à senha atual.');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.peopleService.updatePassword(user.id, hashed);
    return { message: 'Senha alterada com sucesso.' };
  }
}
