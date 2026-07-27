import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Company } from 'src/companies/entities/company.entity';
import { CompanyAccessModule } from 'src/companies/company-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Company]),
    CompanyAccessModule,
  ],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
