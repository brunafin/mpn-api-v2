import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { PersonRole } from 'src/people/enums/person-role.enum';

/** Admin da plataforma ou representante. */
@Injectable()
export class PlatformPortalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtAuthUser }>();
    const user = request.user;
    const allowed =
      user?.role === PersonRole.PLATFORM_ADMIN ||
      user?.role === PersonRole.REPRESENTATIVE;

    if (!allowed) {
      throw new ForbiddenException('Acesso restrito ao portal.');
    }

    return true;
  }
}
