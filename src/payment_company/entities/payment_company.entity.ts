import { Exclude } from "class-transformer";
import { Company } from "src/companies/entities/company.entity";
import { Plan } from "src/plans/entities/plan.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PaymentCompany {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    company_id: number;

    @ManyToOne(() => Company, (company) => company.id)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @Column({ type: 'int' })
    plan_id: number;

    @ManyToOne(() => Plan, (plan) => plan.id)
    @JoinColumn({ name: 'plan_id' })
    plan: Plan;

    @Column({ type: 'timestamp', nullable: true })
    dt_due: Date | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    form_of_payment: string;

    @Column({ type: 'timestamp', nullable: true })
    dt_payment: Date | null;
}
