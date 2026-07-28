import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonCpfUnique1784700000000 implements MigrationInterface {
  name = 'PersonCpfUnique1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_person_cpf" ON "person" ("cpf") WHERE "cpf" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_person_cpf"`);
  }
}
