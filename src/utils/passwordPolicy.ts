/**
 * Política de senha compartilhada pelo backend (signup, troca de senha).
 * Deve espelhar a validação do frontend (mpn-manager/src/utils/passwordPolicy.ts):
 * mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export const PASSWORD_HINT =
  'A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.';

export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && PASSWORD_REGEX.test(password);
}
