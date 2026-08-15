import { getRepositoryToken } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { INestApplicationContext } from '@nestjs/common';

export async function seedSports(app: INestApplicationContext) {
  const sportRepo = app.get(getRepositoryToken(Sport));
  const sports = [
    { name: 'Futsal', needsNet: false },
    { name: 'Fut5', needsNet: false },
    { name: 'Fut7 (Society)', needsNet: false },
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

  for (const sport of sports) {
    const exists = await sportRepo.findOne({ where: { name: sport.name } });
    if (!exists) {
      await sportRepo.save(sport);
    }
  }
  console.log('✅ Seed de Sports concluída!');
}
