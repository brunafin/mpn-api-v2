import { getRepositoryToken } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { INestApplicationContext } from '@nestjs/common';

export async function seedSports(app: INestApplicationContext) {
  const sportRepo = app.get(getRepositoryToken(Sport));
  const sports = [
    { name: 'Futsal' },
    { name: 'Futevôlei' },
    { name: 'Vôlei de quadra' },
    { name: 'Vôlei de areia' },
    { name: 'Beach Tennis' },
    { name: 'Futebol 7' },
  ];

  for (const sport of sports) {
    const exists = await sportRepo.findOne({ where: { name: sport.name } });
    if (!exists) {
      await sportRepo.save(sport);
    }
  }
  console.log('✅ Seed de Sports concluída!');
}