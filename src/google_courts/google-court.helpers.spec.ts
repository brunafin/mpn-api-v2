import {
  detectCompetitor,
  isRelevantPlace,
  namesLookAlike,
  parseCityUfFromAddress,
  phoneDigits,
  previewFromPlace,
} from './google-court.helpers';
import { CourtCompetitor } from './enums/competitor.enum';

describe('google-court.helpers', () => {
  it('phoneDigits remove DDI 55 e deixam DDD + número', () => {
    expect(phoneDigits('+55 19 98888-7777')).toBe('19988887777');
    expect(phoneDigits('(19) 98888-7777')).toBe('19988887777');
    expect(phoneDigits('')).toBe('');
  });

  it('detectCompetitor reconhece agenda de terceiros e site próprio', () => {
    expect(detectCompetitor('https://app.webquadras.com.br/arena')).toBe(
      CourtCompetitor.WEBQUADRAS,
    );
    expect(detectCompetitor('https://agendei.com.br/quadra-x')).toBe(
      CourtCompetitor.AGENDEI,
    );
    expect(detectCompetitor('https://instagram.com/minhaquadra')).toBe(
      CourtCompetitor.UNKNOWN,
    );
    expect(detectCompetitor('https://arenadobairro.com.br')).toBe(
      CourtCompetitor.OWN_SITE,
    );
    expect(detectCompetitor(null)).toBe(CourtCompetitor.UNKNOWN);
  });

  it('isRelevantPlace ignora fechado e fora do tema', () => {
    expect(
      isRelevantPlace({
        displayName: { text: 'Padaria Central' },
        types: ['bakery'],
      }),
    ).toBe(false);
    expect(
      isRelevantPlace({
        displayName: { text: 'Society do Bairro' },
        types: ['point_of_interest'],
      }),
    ).toBe(true);
    expect(
      isRelevantPlace({
        displayName: { text: 'Clube' },
        types: ['sports_complex'],
      }),
    ).toBe(true);
    expect(
      isRelevantPlace({
        displayName: { text: 'Quadra 1' },
        businessStatus: 'CLOSED_PERMANENTLY',
      }),
    ).toBe(false);
  });

  it('parseCityUfFromAddress lê cidade e UF do endereço do Google', () => {
    expect(
      parseCityUfFromAddress(
        'Rua das Palmeiras, 10 - Centro, Campinas - SP, 13010-000, Brasil',
      ),
    ).toEqual({ city: 'Campinas', uf: 'SP' });
    expect(parseCityUfFromAddress('sem cidade')).toEqual({
      city: null,
      uf: null,
    });
  });

  it('namesLookAlike compara nomes ignorando acento', () => {
    expect(namesLookAlike('Arena São José', 'arena sao jose')).toBe(true);
    expect(namesLookAlike('Quadra A', 'Padaria B')).toBe(false);
  });

  it('previewFromPlace monta o cartão da busca sem persistir', () => {
    expect(
      previewFromPlace(
        {
          id: 'ChIJxyz',
          displayName: { text: 'Society do Bairro' },
          nationalPhoneNumber: '(19) 98888-7777',
          formattedAddress: 'Rua A, 10 - Centro, Campinas - SP',
          websiteUri: 'https://agendei.com.br/x',
        },
        'Campinas',
        'SP',
      ),
    ).toMatchObject({
      googlePlaceId: 'ChIJxyz',
      name: 'Society do Bairro',
      phone: '19988887777',
      city: 'Campinas',
      uf: 'SP',
      competitor: CourtCompetitor.AGENDEI,
    });
    expect(previewFromPlace({ displayName: { text: 'Sem id' } }, null, null)).toBeNull();
  });
});
