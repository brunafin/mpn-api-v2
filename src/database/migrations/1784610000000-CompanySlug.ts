import { MigrationInterface, QueryRunner } from 'typeorm';

function slugifyName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'arena';
}

function slugFromInstagram(url: string | null): string | null {
  if (!url) return null;
  const cleaned = url.endsWith('/') ? url.slice(0, -1) : url;
  const part = cleaned.split('/').filter(Boolean).pop();
  if (!part) return null;
  return slugifyName(part);
}

export class CompanySlug1784610000000 implements MigrationInterface {
  name = 'CompanySlug1784610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD "slug" character varying(80)`,
    );

    const rows: { id: number; name: string; instagram_url: string | null }[] =
      await queryRunner.query(
        `SELECT id, name, instagram_url FROM "company" ORDER BY id ASC`,
      );

    const used = new Set<string>();
    for (const row of rows) {
      let candidate =
        slugFromInstagram(row.instagram_url) || slugifyName(row.name);
      let slug = candidate;
      let n = 2;
      while (used.has(slug)) {
        const suffix = `-${n}`;
        slug = `${candidate.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
        n += 1;
      }
      used.add(slug);
      await queryRunner.query(`UPDATE "company" SET "slug" = $1 WHERE id = $2`, [
        slug,
        row.id,
      ]);
    }

    await queryRunner.query(
      `ALTER TABLE "company" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_company_slug" ON "company" ("slug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_company_slug"`);
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "slug"`);
  }
}
