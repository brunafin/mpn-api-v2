import { isValidCpf, normalizeCpf } from './normalize-cpf';

describe('normalizeCpf / isValidCpf', () => {
  it('aceita CPF válido com e sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(normalizeCpf('52998224725')).toBe('52998224725');
  });

  it('rejeita tamanho errado', () => {
    expect(normalizeCpf('00000000')).toBeNull();
    expect(normalizeCpf('123')).toBeNull();
    expect(normalizeCpf('')).toBeNull();
    expect(normalizeCpf(null)).toBeNull();
  });

  it('rejeita dígitos repetidos e checksum inválido', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('12345678901')).toBe(false);
    expect(normalizeCpf('000.000.000-00')).toBeNull();
  });
});
