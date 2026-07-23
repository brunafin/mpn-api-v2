import { isValidPassword, PASSWORD_HINT } from './passwordPolicy';

describe('passwordPolicy', () => {
  it('aceita senha forte alinhada ao manager', () => {
    expect(isValidPassword('Senha@123')).toBe(true);
  });

  it('rejeita senhas curtas ou sem complexidade', () => {
    expect(isValidPassword('senha')).toBe(false);
    expect(isValidPassword('Senha1234')).toBe(false);
    expect(isValidPassword('senha@123')).toBe(false);
    expect(isValidPassword('SENHA@123')).toBe(false);
    expect(isValidPassword('Senha@ab')).toBe(false);
  });

  it('expõe hint estável para a UI', () => {
    expect(PASSWORD_HINT).toMatch(/8 caracteres/i);
  });
});
