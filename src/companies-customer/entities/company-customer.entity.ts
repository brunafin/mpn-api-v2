import { Exclude, Expose } from "class-transformer";
import { Company } from "src/companies/entities/company.entity";
import { CourtSchedule } from "src/court-schedules/entities/court-schedule.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: 'company_customer' })
@Unique(['name', 'phone'])
export class CompanyCustomer {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column({ length: 50, nullable: false })
  @Expose()
  name: string;

  @Column({ type: 'char', length: 11, nullable: false })
  @Expose()
  phone: string;

  @Column({ length: 100, nullable: true })
  @Expose()
  email: string;

  @Column()
  @Exclude()
  company_id: number;

  @ManyToOne(() => Company, (company) => company.id)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => CourtSchedule, (schedule) => schedule.company_customer)
  court_schedules: CourtSchedule[];
}
