import { getRepositoryToken } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { INestApplicationContext } from '@nestjs/common';

export async function seedSports(app: INestApplicationContext) {
  const sportRepo = app.get(getRepositoryToken(Sport));
  const sports = [
    { name: 'Futsal', needsNet: false },
    { name: 'Fut5', needsNet: false },
    { name: 'Fut6', needsNet: false },
    { name: 'Fut7', needsNet: false },
    { name: 'Futebol de campo 11', needsNet: false },
    { name: 'Futevôlei', needsNet: true },
    { name: 'Vôlei de quadra', needsNet: true },
    { name: 'Vôlei de areia', needsNet: true },
    { name: 'Beach Tennis', needsNet: true },
    { name: 'Tênis', needsNet: true },
    { name: 'Padel', needsNet: true },
    { name: 'Pickleball', needsNet: true },
    { name: 'Basquete', needsNet: false },
  ];

  const legacyFut7 = await sportRepo.findOne({
    where: { name: 'Fut7 (Society)' },
  });
  if (legacyFut7 && !(await sportRepo.findOne({ where: { name: 'Fut7' } }))) {
    legacyFut7.name = 'Fut7';
    await sportRepo.save(legacyFut7);
  }

  for (const sport of sports) {
    const exists = await sportRepo.findOne({ where: { name: sport.name } });
    if (!exists) {
      await sportRepo.save(sport);
    }
  }
  console.log('✅ Seed de Sports concluída!');
}
