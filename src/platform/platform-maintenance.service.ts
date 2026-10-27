import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isPgUniqueViolation } from 'src/common/db/pg-error';
import { Repository } from 'typeorm';
import { DELINQUENCY_BLOCK_AFTER_DAYS } from 'src/billing/delinquency';
import { UpdatePlatformMaintenanceDto } from './dto/update-platform-maintenance.dto';
import { PlatformSetting } from './entities/platform-setting.entity';

const SETTING_ID = 1;

export type PlatformMaintenanceView = {
  maintenance: boolean;
  message: string | null;
  updatedAt: Date;
};

export type DelinquencyPolicyView = {
  blockAfterDays: number;
  updatedAt: Date;
};

@Injectable()
export class PlatformMaintenanceService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>,
  ) {}

  async get(): Promise<PlatformMaintenanceView> {
    const row = await this.getRow();
    return this.toView(row);
  }

  async update(
    dto: UpdatePlatformMaintenanceDto,
  ): Promise<PlatformMaintenanceView> {
    const row = await this.getRow();
    row.maintenance_enabled = dto.maintenance;
    if (dto.message !== undefined) {
      const trimmed = dto.message?.trim() ?? '';
      row.maintenance_message = trimmed.length > 0 ? trimmed : null;
    }
    const saved = await this.settingsRepository.save(row);
    return this.toView(saved);
  }

  async getDelinquencyPolicy(): Promise<DelinquencyPolicyView> {
    const row = await this.getRow();
    return this.toDelinquencyView(row);
  }

  async updateDelinquencyPolicy(
    blockAfterDays: number,
  ): Promise<DelinquencyPolicyView> {
    const row = await this.getRow();
    row.delinquency_block_after_days = blockAfterDays;
    const saved = await this.settingsRepository.save(row);
    return this.toDelinquencyView(saved);
  }

  private async getRow(): Promise<PlatformSetting> {
    const existing = await this.settingsRepository.findOne({
      where: { id: SETTING_ID },
    });
    if (existing) return existing;

    try {
      return await this.settingsRepository.save(
        this.settingsRepository.create({
          id: SETTING_ID,
          maintenance_enabled: false,
          maintenance_message: null,
          delinquency_block_after_days: DELINQUENCY_BLOCK_AFTER_DAYS,
        }),
      );
    } catch (error) {
      if (!isPgUniqueViolation(error)) throw error;
      const raced = await this.settingsRepository.findOne({
        where: { id: SETTING_ID },
      });
      if (raced) return raced;
      throw error;
    }
  }

  private toView(row: PlatformSetting): PlatformMaintenanceView {
    return {
      maintenance: row.maintenance_enabled,
      message: row.maintenance_message?.trim() || null,
      updatedAt: row.updated_at,
    };
  }

  private toDelinquencyView(row: PlatformSetting): DelinquencyPolicyView {
    return {
      blockAfterDays:
        row.delinquency_block_after_days ?? DELINQUENCY_BLOCK_AFTER_DAYS,
      updatedAt: row.updated_at,
    };
  }
}
