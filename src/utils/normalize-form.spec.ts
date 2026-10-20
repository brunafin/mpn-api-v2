import {
  normalizeAddressNumber,
  normalizeAddressText,
  normalizeCepStored,
  normalizeEmail,
  normalizeInstagramUrl,
  normalizePersonName,
  normalizePhoneDigits,
  normalizeTitle,
  normalizeUf,
} from './normalize-form';

describe('normalize-form', () => {
  it('limpa nome de pessoa e descarta emoji', () => {
    expect(normalizePersonName('  joão   silva 😀 ')).toBe('joão silva');
  });

  it('grava endereço em maiúsculas e UF com 2 letras', () => {
    expect(normalizeAddressText(' rua dos  andradas ', 100)).toBe(
      'RUA DOS ANDRADAS',
    );
    expect(normalizeUf(' rs ')).toBe('RS');
    expect(normalizeAddressNumber('12a3')).toBe('123');
  });

  it('mascara CEP e reduz telefone a dígitos', () => {
    expect(normalizeCepStored('90010-000')).toBe('90010-000');
    expect(normalizePhoneDigits('(51) 99999-0000')).toBe('51999990000');
  });

  it('normaliza e-mail e instagram', () => {
    expect(normalizeEmail('  Joao@Email.com ')).toBe('joao@email.com');
    expect(normalizeInstagramUrl('@MinhaArena')).toBe(
      'https://instagram.com/minhaarena',
    );
    expect(normalizeTitle(' Quadra  1 ', 100)).toBe('Quadra 1');
  });
});
