import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Repository } from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { format, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';

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
    await this.notesRepository.save({
      ...createNoteDto,
      company_id: company.id,
    });
    if (createNoteDto.is24HoursBefore) {
      await this.notesRepository.save({
        ...createNoteDto,
        company_id: company.id,
        date: new Date(
          new Date(createNoteDto.date).getTime() - 24 * 60 * 60 * 1000,
        ),
      });
    }
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
        date: new Date(formatted),
        is_read: false,
      },
    });

    return count;
  }

  async findByDate(
    companyPublicId: string,
    date: Date,
    ownerPublicId: string,
  ) {
    const company = await this.getOwnedCompany(companyPublicId, ownerPublicId);
    const notes = await this.notesRepository.find({
      select: ['id', 'sender', 'message', 'title'],
      where: {
        company_id: company.id,
        date,
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
