import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonRoleAndLastLogin1784630000000 implements MigrationInterface {
  name = 'PersonRoleAndLastLogin1784630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ADD "role" character varying(32) NOT NULL DEFAULT 'owner'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ADD "last_login_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "person" DROP COLUMN "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "person" DROP COLUMN "role"`);
  }
}
