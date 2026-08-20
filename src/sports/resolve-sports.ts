import { BadRequestException } from '@nestjs/common';
import { Sport } from './entities/sport.entity';

export const SPORT_NAME_MAX_LENGTH = 20;

/** Rótulos antigos ou alternativos → nome canônico do catálogo. */
export const SPORT_NAME_ALIASES: Record<string, string> = {
  society: 'Fut7 (Society)',
  fut7: 'Fut7 (Society)',
  fut11: 'Futebol de campo 11',
  'futebol de campo': 'Futebol de campo 11',
  voleibol: 'Vôlei de quadra',
  'vôlei de praia': 'Vôlei de areia',
  'volei de praia': 'Vôlei de areia',
  'beach tennis': 'Beach Tennis',
};

/**
 * Catálogo disponível no manager.
 * Se o registro ainda não existe no banco, cria com este needsNet sem exigir
 * o campo no payload.
 */
export const SPORT_CATALOG_NEEDS_NET: Record<string, boolean> = {
  futsal: false,
  fut5: false,
  fut6: false,
  'fut7 (society)': false,
  'futebol de campo 11': false,
  futevôlei: true,
  futevolei: true,
  'vôlei de quadra': true,
  'volei de quadra': true,
  'vôlei de areia': true,
  'volei de areia': true,
  'beach tennis': true,
  tênis: true,
  tenis: true,
  padel: true,
  pickleball: true,
  basquete: false,
};

export type SportNameInput = {
  name: string;
  needsNet?: boolean;
};

type SportStore = {
  find: () => Promise<Sport[]>;
  create: (data: Partial<Sport>) => Sport;
  save: (entities: Sport[]) => Promise<Sport[]>;
};

export function canonicalSportName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const alias = SPORT_NAME_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

function resolveNeedsNet(
  name: string,
  explicit: boolean | undefined,
): boolean | undefined {
  if (typeof explicit === 'boolean') return explicit;
  const fromCatalog = SPORT_CATALOG_NEEDS_NET[name.toLowerCase()];
  return typeof fromCatalog === 'boolean' ? fromCatalog : undefined;
}

export async function resolveSportsByName(
  store: SportStore,
  inputs: SportNameInput[],
): Promise<Sport[]> {
  const requested = Array.from(
    new Map(
      inputs
        .map((input) => ({
          name: canonicalSportName(input.name),
          needsNet: input.needsNet,
        }))
        .filter((input) => input.name.length > 0)
        .map((input) => [input.name.toLowerCase(), input]),
    ).values(),
  );

  if (requested.length === 0) {
    throw new BadRequestException('Informe ao menos um esporte por quadra.');
  }

  for (const input of requested) {
    if (input.name.length > SPORT_NAME_MAX_LENGTH) {
      throw new BadRequestException(
        `Nome do esporte deve ter no máximo ${SPORT_NAME_MAX_LENGTH} caracteres.`,
      );
    }
  }

  const existing = await store.find();
  const byName = new Map(
    existing.map((sport) => [sport.name.toLowerCase(), sport]),
  );

  const toCreate: Sport[] = [];
  for (const input of requested) {
    if (byName.has(input.name.toLowerCase())) continue;
    const needsNet = resolveNeedsNet(input.name, input.needsNet);
    if (typeof needsNet !== 'boolean') {
      throw new BadRequestException(
        `Informe se o esporte "${input.name}" usa rede.`,
      );
    }
    toCreate.push(store.create({ name: input.name, needsNet }));
  }

  if (toCreate.length > 0) {
    const created = await store.save(toCreate);
    for (const sport of created) {
      byName.set(sport.name.toLowerCase(), sport);
    }
  }

  return requested.map((input) => byName.get(input.name.toLowerCase())!);
}
