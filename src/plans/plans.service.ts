import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Repository } from 'typeorm';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Plan } from './entities/plan.entity';
import { PlanEnum } from './enum/enum';

const SYSTEM_PLAN_IDS = new Set<number>([
  PlanEnum.FREE,
  PlanEnum.BASIC,
  PlanEnum.PENDENCE,
]);

type PlanResponse = {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  pricePerCourt: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(PaymentCompany)
    private readonly paymentsRepository: Repository<PaymentCompany>,
  ) {}

  async create(dto: CreatePlanDto): Promise<PlanResponse> {
    const plan = this.plansRepository.create({
      name: dto.name.trim(),
      description: dto.description.trim(),
      base_price: dto.basePrice,
      price_per_court: dto.pricePerCourt,
    });
    const saved = await this.plansRepository.save(plan);
    return this.mapPlan(saved);
  }

  async findAll(): Promise<PlanResponse[]> {
    const plans = await this.plansRepository.find({
      order: { name: 'ASC' },
    });
    return plans.map((plan) => this.mapPlan(plan));
  }

  async findOne(id: number): Promise<PlanResponse> {
    const plan = await this.findPlanOrFail(id);
    return this.mapPlan(plan);
  }

  async update(id: number, dto: UpdatePlanDto): Promise<PlanResponse> {
    const plan = await this.findPlanOrFail(id);

    if (dto.name !== undefined) plan.name = dto.name.trim();
    if (dto.description !== undefined) plan.description = dto.description.trim();
    if (dto.basePrice !== undefined) plan.base_price = dto.basePrice;
    if (dto.pricePerCourt !== undefined) {
      plan.price_per_court = dto.pricePerCourt;
    }

    const saved = await this.plansRepository.save(plan);
    return this.mapPlan(saved);
  }

  async remove(id: number): Promise<{ ok: true }> {
    const plan = await this.findPlanOrFail(id);

    const companiesUsing = await this.companiesRepository.count({
      where: { plan_id: plan.id },
    });
    if (companiesUsing > 0) {
      throw new ConflictException(
        'Não é possível excluir: há clientes usando este plano.',
      );
    }

    const paymentsUsing = await this.paymentsRepository.count({
      where: { plan_id: plan.id },
    });
    if (paymentsUsing > 0) {
      throw new ConflictException(
        'Não é possível excluir: há pagamentos vinculados a este plano.',
      );
    }

    await this.plansRepository.remove(plan);
    return { ok: true };
  }

  private async findPlanOrFail(id: number): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plano não encontrado.');
    }
    return plan;
  }

  private mapPlan(plan: Plan): PlanResponse {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      basePrice: Number(plan.base_price),
      pricePerCourt: Number(plan.price_per_court),
      isSystem: SYSTEM_PLAN_IDS.has(plan.id),
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    };
  }
}
