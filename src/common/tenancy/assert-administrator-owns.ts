import { ForbiddenException } from '@nestjs/common';

/** Compara o public_id do administrador da empresa com o JWT (sub). */
export function assertAdministratorOwns(
  administratorPublicId: string | undefined | null,
  ownerPublicId: string,
  message = 'Você não tem acesso a este estabelecimento.',
): void {
  if (!administratorPublicId || administratorPublicId !== ownerPublicId) {
    throw new ForbiddenException(message);
  }
}
