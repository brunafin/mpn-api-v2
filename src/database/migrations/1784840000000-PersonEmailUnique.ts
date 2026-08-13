import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * E-mail é o login. Unique case-insensitive.
 * Duplicatas: fica a conta ativa (senão o menor id); as outras perdem o e-mail.
 */
export class PersonEmailUnique1784840000000 implements MigrationInterface {
  name = 'PersonEmailUnique1784840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "person"
      SET "email" = LOWER(TRIM("email"))
      WHERE "email" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "person" AS extra
      SET "email" = NULL
      FROM (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(email)
              ORDER BY
                CASE WHEN status THEN 0 ELSE 1 END,
                id ASC
            ) AS rn
          FROM "person"
          WHERE email IS NOT NULL
        ) ranked
        WHERE rn > 1
      ) dups
      WHERE extra.id = dups.id
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_person_email"
      ON "person" (LOWER("email"))
      WHERE "email" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_person_email"`);
  }
}
