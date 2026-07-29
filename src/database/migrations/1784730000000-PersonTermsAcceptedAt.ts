import { MigrationInterface, QueryRunner } from 'typeorm';

/** Coluna para registrar aceite de Termos/Privacidade no cadastro. */
export class PersonTermsAcceptedAt1784730000000 implements MigrationInterface {
  name = 'PersonTermsAcceptedAt1784730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ADD "terms_accepted_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" DROP COLUMN "terms_accepted_at"`,
    );
  }
}
