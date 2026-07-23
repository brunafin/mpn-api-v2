import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { PersonRole } from 'src/people/enums/person-role.enum';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtAuthUser }>();
    const user = request.user;

    if (!user || user.role !== PersonRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Acesso restrito à plataforma.');
    }

    return true;
  }
}
