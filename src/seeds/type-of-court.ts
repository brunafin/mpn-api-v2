import { getRepositoryToken } from '@nestjs/typeorm';
import { TypeOfCourt } from '../type-of-court/entities/type-of-court.entity';
import { INestApplicationContext } from '@nestjs/common';

export async function seedTypeOfCourt(app: INestApplicationContext) {
  const typeOfCourtRepo = app.get(getRepositoryToken(TypeOfCourt));
  const typeOfCourts = [
    { name: 'Futsal', description: 'Quadra de futsal' },
    { name: 'Society', description: 'Quadra society' },
    { name: 'Beach', description: 'Quadra de areia' },
  ];

  for (const type of typeOfCourts) {
    const exists = await typeOfCourtRepo.findOne({ where: { name: type.name } });
    if (!exists) {
      await typeOfCourtRepo.save(type);
    }
  }
  console.log('✅ Seed de TypeOfCourt concluída!');
}