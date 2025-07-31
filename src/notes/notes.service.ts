import { Injectable } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';


@Injectable()
export class NotesService {

  constructor(
    @InjectRepository(Note)
    private readonly notesRepository: Repository<Note>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,

  ) { }

  async create(createNoteDto: CreateNoteDto) {
    const company = await this.companiesRepository.findOne({ where: { public_id: createNoteDto.companyPublicId } });
    if (!company) {
      throw new Error('Não foi possível criar o lembrete. Empresa não encontrada');
    }
    await this.notesRepository.save({
      ...createNoteDto,
      company_id: company.id,
    });
    if (createNoteDto.is24HoursBefore) {
      await this.notesRepository.save({
        ...createNoteDto,
        company_id: company.id,
        date: new Date(new Date(createNoteDto.date).getTime() - 24 * 60 * 60 * 1000),
      });
    }
    return { message: 'Lembrete criado com sucesso' };
  }

  async counter(companyPublicId: string) {
    const company = await this.companiesRepository.findOne({ where: { public_id: companyPublicId } });
    if (!company) {
      throw new Error('Não foi possível encontrar lembretes. Empresa não encontrada');
    }

    const timeZone = 'America/Sao_Paulo';
    const now = new Date();
    const zonedDate = toZonedTime(now, timeZone);
    const startOfZonedDay = startOfDay(zonedDate);
    const formatted = format(startOfZonedDay, 'yyyy-MM-dd');

    const count = await this.notesRepository.count({
      where: {
        company_id: company.id,
        date: new Date(formatted),
        is_read: false,
      },
    });

    return count;
  }

  async findByDate(companyPublicId: string, date: Date) {
    const company = await this.companiesRepository.findOne({ where: { public_id: companyPublicId } });
    if (!company) {
      throw new Error('Não foi possível encontrar lembretes. Empresa não encontrada');
    }
    const notes = await this.notesRepository.find({
      select: ['id', 'sender', 'message', 'title'],
      where: {
        company_id: company.id,
        date,
        is_read: false,
      },
      order: {
        id: 'DESC',
      }
    });
    return notes;
  }

  async update(id: number) {
    const note = await this.notesRepository.findOne({ where: { id } });
    if (!note) {
      throw new Error('Nota não encontrada');
    }
    await this.notesRepository.update(id, { is_read: true });
    return { message: 'Nota atualizada com sucesso' };
  }

  // remove(id: number) {
  //   return `This action removes a #${id} note`;
  // }
}
