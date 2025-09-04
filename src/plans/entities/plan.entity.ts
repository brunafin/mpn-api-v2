import { Exclude } from "class-transformer";
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company } from "../../companies/entities/company.entity";
import { OneToMany } from "typeorm";

@Entity()
export class Plan {
    @PrimaryGeneratedColumn()
    @Exclude()
    id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @Exclude()
    created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
    @Exclude()
    updated_at: Date;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 200 })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @OneToMany(() => Company, company => company.plan)
    companies: Company[];
}
