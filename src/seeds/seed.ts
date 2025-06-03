// src/seeds/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import createDatabaseIfNotExists from '../database-init';
import { seedDaysOfWeek } from './days-of-week';
import { seedTypeOfCourt } from './type-of-court';
import { seedSports } from './sports';

async function runAllSeeds() {
  await createDatabaseIfNotExists();

  const app = await NestFactory.createApplicationContext(AppModule);

  await seedDaysOfWeek(app);
  await seedTypeOfCourt(app);
  await seedSports(app);

  await app.close();
  console.log('🎉 Todos os seeds foram executados!');
}

runAllSeeds().catch((err) => {
  console.error('Erro ao executar os seeds:', err);
  process.exit(1);
});
