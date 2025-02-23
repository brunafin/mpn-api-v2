import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'web', name: 'days-of-week' })
export class DaysOfWeek {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 3 })
  abbreviation: string;

  @Column({ length: 50 })
  description: string;

  @Column({ type: 'int' })
  ref: number;

  // @OneToMany(() => Grade, (grade) => grade.diaSemana)
  // grades: Grade[];

  // @OneToMany(() => Horario, (horario) => horario.diaSemana)
  // horarios: Horario[];
}
