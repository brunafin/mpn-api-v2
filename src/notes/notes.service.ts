import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import {
  NOTE_MESSAGE_MAX_LENGTH,
  sanitizeNoteText,
} from 'src/utils/sanitize-note-text';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly notesRepository: Repository<Note>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  private async getOwnedCompany(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { public_id: companyPublicId },
      relations: ['administrator'],
    });
    if (!company) {
      throw new NotFoundException(
        'Não foi possível encontrar lembretes. Empresa não encontrada',
      );
    }
    assertAdministratorOwns(company.administrator?.public_id, ownerPublicId);
    return company;
  }

  async create(createNoteDto: CreateNoteDto, ownerPublicId: string) {
    const company = await this.getOwnedCompany(
      createNoteDto.companyPublicId,
      ownerPublicId,
    );
    const message = sanitizeNoteText(
      createNoteDto.message,
      NOTE_MESSAGE_MAX_LENGTH,
    );
    if (!message) {
      throw new BadRequestException(
        'Uma mensagem é necessária para criar um lembrete.',
      );
    }
    const dateKey = createNoteDto.date.slice(0, 10);
    const noteFields = {
      date: dateKey,
      message,
      company_id: company.id,
    };
    await this.notesRepository.save(noteFields);
    return { message: 'Lembrete criado com sucesso' };
  }

  async counter(companyPublicId: string, ownerPublicId: string) {
    const company = await this.getOwnedCompany(companyPublicId, ownerPublicId);

    const timeZone = 'America/Sao_Paulo';
    const now = new Date();
    const zonedDate = toZonedTime(now, timeZone);
    const startOfZonedDay = startOfDay(zonedDate);
    const formatted = format(startOfZonedDay, 'yyyy-MM-dd');

    const count = await this.notesRepository.count({
      where: {
        company_id: company.id,
        date: formatted as unknown as Date,
        is_read: false,
      },
    });

    return count;
  }

  async findByDate(
    companyPublicId: string,
    date: string | Date,
    ownerPublicId: string,
  ) {
    const company = await this.getOwnedCompany(companyPublicId, ownerPublicId);
    const dateKey =
      typeof date === 'string'
        ? date.slice(0, 10)
        : date.toISOString().slice(0, 10);
    const notes = await this.notesRepository.find({
      select: ['id', 'sender', 'message', 'title'],
      where: {
        company_id: company.id,
        date: dateKey as unknown as Date,
        is_read: false,
      },
      order: {
        id: 'DESC',
      },
    });
    return notes;
  }

  async update(id: number, ownerPublicId: string) {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: { company: { administrator: true } },
    });
    if (!note) {
      throw new NotFoundException('Nota não encontrada');
    }
    assertAdministratorOwns(
      note.company?.administrator?.public_id,
      ownerPublicId,
    );
    await this.notesRepository.update(id, { is_read: true });
    return { message: 'Nota atualizada com sucesso' };
  }
}
