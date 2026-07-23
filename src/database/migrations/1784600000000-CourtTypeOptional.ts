import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourtTypeOptional1784600000000 implements MigrationInterface {
  name = 'CourtTypeOptional1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court" ALTER COLUMN "type_of_court_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court" ALTER COLUMN "type_of_court_id" SET NOT NULL`,
    );
  }
}
