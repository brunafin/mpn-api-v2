import { BadRequestException } from '@nestjs/common';
import {
  canonicalSportName,
  resolveSportsByName,
} from './resolve-sports';

describe('resolveSportsByName', () => {
  it('aplica alias de Voleibol para o seed', () => {
    expect(canonicalSportName('Voleibol')).toBe('Vôlei de quadra');
    expect(canonicalSportName('Vôlei de praia')).toBe('Vôlei de areia');
    expect(canonicalSportName('Beach tennis')).toBe('Beach Tennis');
    expect(canonicalSportName('Society')).toBe('Fut7 (Society)');
    expect(canonicalSportName('Fut11')).toBe('Futebol de campo 11');
  });

  it('reusa o catálogo e cria Fut7 canônico sem needsNet', async () => {
    const existing = [{ id: 1, name: 'Futsal', needsNet: false }];
    const store = {
      find: jest.fn().mockResolvedValue(existing),
      create: jest.fn((x) => x),
      save: jest.fn(async (rows) =>
        rows.map((row: { name: string }, i: number) => ({
          id: 10 + i,
          ...row,
        })),
      ),
    };

    const result = await resolveSportsByName(store, [
      { name: 'Futsal' },
      { name: 'Fut7 (Society)' },
    ]);

    expect(store.save).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Fut7 (Society)', needsNet: false }),
    ]);
    expect(result.map((s) => s.name)).toEqual(['Futsal', 'Fut7 (Society)']);
  });

  it('normaliza Society legado para Fut7 (Society)', async () => {
    const store = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn(async (rows) =>
        rows.map((row: { name: string }, i: number) => ({
          id: 10 + i,
          ...row,
        })),
      ),
    };

    const result = await resolveSportsByName(store, [{ name: 'Society' }]);

    expect(store.save).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Fut7 (Society)', needsNet: false }),
    ]);
    expect(result.map((s) => s.name)).toEqual(['Fut7 (Society)']);
  });

  it('recusa esporte novo sem needsNet', async () => {
    const store = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    await expect(
      resolveSportsByName(store, [{ name: 'Novo esporte' }]),
    ).rejects.toThrow(BadRequestException);
    expect(store.save).not.toHaveBeenCalled();
  });
});
