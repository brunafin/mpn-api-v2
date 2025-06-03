// src/seeds/seed-days-of-week.ts
import { getRepositoryToken } from '@nestjs/typeorm';
import { DaysOfWeek } from '../days-of-week/entities/days-of-week.entity';
import { INestApplicationContext } from '@nestjs/common';

export async function seedDaysOfWeek(app: INestApplicationContext) {
  const daysOfWeekRepo = app.get(getRepositoryToken(DaysOfWeek));

  const days = [
    { abbreviation: 'DOM', description: 'Domingo', ref: 7 },
    { abbreviation: 'SEG', description: 'Segunda-feira', ref: 1 },
    { abbreviation: 'TER', description: 'Terça-feira', ref: 2 },
    { abbreviation: 'QUA', description: 'Quarta-feira', ref: 3 },
    { abbreviation: 'QUI', description: 'Quinta-feira', ref: 4 },
    { abbreviation: 'SEX', description: 'Sexta-feira', ref: 5 },
    { abbreviation: 'SAB', description: 'Sábado', ref: 6 },
  ];

  for (const day of days) {
    const exists = await daysOfWeekRepo.findOne({ where: { ref: day.ref } });
    if (!exists) {
      await daysOfWeekRepo.save(day);
    }
  }

  console.log('✅ Seed de DaysOfWeek concluída!');
}
