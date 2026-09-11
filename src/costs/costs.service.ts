import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlatformCostDto } from './dto/create-platform-cost.dto';
import { UpdatePlatformCostDto } from './dto/update-platform-cost.dto';
import { PlatformCost } from './entities/platform-cost.entity';
import { CostRecurrence } from './enums/cost-recurrence.enum';
import { monthlyEquivalent } from './monthly-equivalent';

export type PlatformCostResponse = {
  id: number;
  description: string;
  amount: number;
  recurrence: CostRecurrence;
  monthlyEquivalent: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CostsService {
  constructor(
    @InjectRepository(PlatformCost)
    private readonly costsRepository: Repository<PlatformCost>,
  ) {}

  async create(dto: CreatePlatformCostDto): Promise<PlatformCostResponse> {
    const cost = this.costsRepository.create({
      description: dto.description.trim(),
      amount: dto.amount,
      recurrence: dto.recurrence,
    });
    const saved = await this.costsRepository.save(cost);
    return this.mapCost(saved);
  }

  async findAll(): Promise<PlatformCostResponse[]> {
    const costs = await this.costsRepository.find({
      order: { description: 'ASC' },
    });
    return costs.map((cost) => this.mapCost(cost));
  }

  async update(
    id: number,
    dto: UpdatePlatformCostDto,
  ): Promise<PlatformCostResponse> {
    const cost = await this.findOrFail(id);
    if (dto.description !== undefined) cost.description = dto.description.trim();
    if (dto.amount !== undefined) cost.amount = dto.amount;
    if (dto.recurrence !== undefined) cost.recurrence = dto.recurrence;
    const saved = await this.costsRepository.save(cost);
    return this.mapCost(saved);
  }

  async remove(id: number): Promise<{ ok: true }> {
    const cost = await this.findOrFail(id);
    await this.costsRepository.remove(cost);
    return { ok: true };
  }

  private async findOrFail(id: number): Promise<PlatformCost> {
    const cost = await this.costsRepository.findOne({ where: { id } });
    if (!cost) {
      throw new NotFoundException('Custo não encontrado.');
    }
    return cost;
  }

  private mapCost(cost: PlatformCost): PlatformCostResponse {
    const amount = Number(cost.amount);
    return {
      id: Number(cost.id),
      description: cost.description,
      amount,
      recurrence: cost.recurrence,
      monthlyEquivalent: Number(
        monthlyEquivalent(amount, cost.recurrence).toFixed(2),
      ),
      createdAt: cost.created_at,
      updatedAt: cost.updated_at,
    };
  }
}
