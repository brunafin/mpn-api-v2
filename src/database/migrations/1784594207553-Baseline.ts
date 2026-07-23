import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1784594207553 implements MigrationInterface {
  name = 'Baseline1784594207553';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "google_courts"`);
    await queryRunner.query(
      `CREATE TABLE "day_of_week" ("id" SERIAL NOT NULL, "abbreviation" character(3) NOT NULL, "description" character varying(13) NOT NULL, "ref" integer NOT NULL, CONSTRAINT "PK_0e915d6910c68f10e3e73005e73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "contact_name" character varying(50) NOT NULL, "contact_phone" character(11) NOT NULL, "token_to_cancel" text, "is_prepaid" boolean NOT NULL DEFAULT false, "is_barbecue_included" boolean NOT NULL DEFAULT false, "is_event" boolean NOT NULL DEFAULT false, "observation" text, "sport_id" integer NOT NULL, "court_schedule_id" integer NOT NULL, CONSTRAINT "UQ_01092796b9686aeac854fc7bd1d" UNIQUE ("public_id"), CONSTRAINT "REL_b1735a304045a51b6c271a0cda" UNIQUE ("court_schedule_id"), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sport" ("id" SERIAL NOT NULL, "name" character varying(20) NOT NULL, "needsNet" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_c67275331afac347120a1032825" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "operating_schedule" ("hour" TIME NOT NULL, "price" numeric(10,2) NOT NULL, "is_fixed" boolean NOT NULL DEFAULT false, "day_of_week_id" integer NOT NULL, "court_id" integer NOT NULL, "company_customer_id" integer, "sport_id" integer, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_2c638d42f660f76c5a050e6e820" UNIQUE ("hour", "court_id", "day_of_week_id"), CONSTRAINT "PK_2c638d42f660f76c5a050e6e820" PRIMARY KEY ("hour", "day_of_week_id", "court_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "type_of_court" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying(50) NOT NULL, CONSTRAINT "PK_4285b5b9df842de6ffd2b62619d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "court" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "note_stars" real, "company_id" integer NOT NULL, "type_of_court_id" integer NOT NULL, "show" boolean NOT NULL DEFAULT false, "is_covered" boolean NOT NULL DEFAULT true, "is_can_have_net" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_e9a4f10b78ebfcad6cbf3705b76" UNIQUE ("public_id"), CONSTRAINT "CHK_f464cc019c7b537b1b95b7482a" CHECK ("note_stars" >= 0 AND "note_stars" <= 5), CONSTRAINT "PK_d8f2118c52b422b03e0331a7b91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "court_schedule" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "start_hour" TIME NOT NULL, "end_hour" TIME NOT NULL, "date" date NOT NULL, "available" boolean NOT NULL DEFAULT true, "price" numeric(10,2) NOT NULL, "court_id" integer NOT NULL, "day_of_week_id" integer NOT NULL, "is_fixed" boolean NOT NULL DEFAULT false, "company_customer_id" integer, "sport_id" integer, CONSTRAINT "UQ_141b6bc7d235bd1384ab2a1820a" UNIQUE ("public_id"), CONSTRAINT "UQ_cab1b1d27216b2da3a9e527052b" UNIQUE ("start_hour", "date", "court_id"), CONSTRAINT "PK_03c75bebfa893be94392f0826c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_customer" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "phone" character(11) NOT NULL, "email" character varying(100), "company_id" integer NOT NULL, CONSTRAINT "UQ_e661c0832c4a6512cbe1ca4a3ca" UNIQUE ("name", "phone", "company_id"), CONSTRAINT "PK_4f8b4c49d336c1091ffd429a059" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_image" ("id" SERIAL NOT NULL, "url" text NOT NULL, "company_id" integer NOT NULL, CONSTRAINT "PK_6ab2cb6d2e7bbc45e236dfffc40" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "plan" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "description" character varying(200) NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_54a2b686aed3b637654bf7ddbb3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_company" ("id" SERIAL NOT NULL, "company_id" integer NOT NULL, "plan_id" integer NOT NULL, "dt_due" TIMESTAMP, "price" numeric(10,2) NOT NULL DEFAULT '0', "form_of_payment" character varying(50), "dt_payment" TIMESTAMP, CONSTRAINT "PK_3e9244ca0c1af4a3601f1795ff6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "phone" character(11), "logo_url" text, "photo_highlight_url" text, "instagram_url" text, "facebook_url" text, "email" character varying(100), "cep" character(9), "street" character varying(100), "number" character varying(10), "city" character varying(50), "neighborhood" character varying(50), "uf" character(2), "day_due" integer, "administrator_id" integer, "plan_id" integer, "characteristics" text array, "is_active" boolean NOT NULL DEFAULT false, "preferences_is_hidden_inactive_hours" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_7661a9e2aa27c887ef13766d936" UNIQUE ("public_id"), CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "person" ("id" SERIAL NOT NULL, "public_id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "phone" character(11), "email" character varying(100), "cpf" character(11), "born_date" TIMESTAMP, "cep" character(9), "street" character varying(100), "number" character varying(10), "city" character varying(50), "neighborhood" character varying(50), "uf" character(2), "status" boolean NOT NULL DEFAULT true, "username" character varying(20) NOT NULL, "password" text NOT NULL, CONSTRAINT "UQ_276e2f482fdd2fff8147578a085" UNIQUE ("public_id"), CONSTRAINT "UQ_e4475bde6806df5ab6999b47e5b" UNIQUE ("username"), CONSTRAINT "PK_5fdaf670315c4b7e70cce85daa3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notes" ("id" SERIAL NOT NULL, "date" date NOT NULL, "title" text, "message" text NOT NULL, "sender" character varying(50), "is_read" boolean NOT NULL DEFAULT false, "company_id" integer NOT NULL, CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "google_courts"."city" ("id" SERIAL NOT NULL, "ibge_id" integer NOT NULL, "name" character varying(255) NOT NULL, "state" character varying(255) NOT NULL, "uf" character(2) NOT NULL, "is_active" boolean NOT NULL DEFAULT false, "dt_last_check" date, CONSTRAINT "UQ_4f452dd21688ea98e943fb3ec85" UNIQUE ("ibge_id"), CONSTRAINT "PK_b222f51ce26f7e5ca86944a6739" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "google_courts"."google_court" ("id" SERIAL NOT NULL, "google_place_id" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "phone" character varying(50), "full_address" text, "already_registered" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_d75b2fbc420f000ca0791066b1f" UNIQUE ("google_place_id"), CONSTRAINT "PK_2837239f81271008369a0013cb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "court_sports" ("sport_id" integer NOT NULL, "court_id" integer NOT NULL, CONSTRAINT "PK_755ab370112682dd3e6a02dd02a" PRIMARY KEY ("sport_id", "court_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ec019662ef92c205ffe14d783" ON "court_sports" ("sport_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2242e5347f848ce107e3ac92df" ON "court_sports" ("court_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_d1178e34abbbfdbf3065b3385f9" FOREIGN KEY ("sport_id") REFERENCES "sport"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_b1735a304045a51b6c271a0cda8" FOREIGN KEY ("court_schedule_id") REFERENCES "court_schedule"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" ADD CONSTRAINT "FK_5d357511f14e5e1b5df32c540dc" FOREIGN KEY ("court_id") REFERENCES "court"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" ADD CONSTRAINT "FK_7018ea79dbfd5fd0133f28aa21d" FOREIGN KEY ("day_of_week_id") REFERENCES "day_of_week"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" ADD CONSTRAINT "FK_81d096d802d292d1725710892e4" FOREIGN KEY ("company_customer_id") REFERENCES "company_customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" ADD CONSTRAINT "FK_b5120f13e1b666149cf5afcd867" FOREIGN KEY ("sport_id") REFERENCES "sport"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court" ADD CONSTRAINT "FK_7164297daa104a52175126a5b81" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court" ADD CONSTRAINT "FK_c0bced15a27a93d77da9930366a" FOREIGN KEY ("type_of_court_id") REFERENCES "type_of_court"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD CONSTRAINT "FK_b767833f4ce4a69727852b8052b" FOREIGN KEY ("court_id") REFERENCES "court"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD CONSTRAINT "FK_4dc1a74828dfda96dc8ba880315" FOREIGN KEY ("day_of_week_id") REFERENCES "day_of_week"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD CONSTRAINT "FK_24cff6b39c604fc27787de50d07" FOREIGN KEY ("company_customer_id") REFERENCES "company_customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD CONSTRAINT "FK_ef4ec18ff59ab287c9aa5fa6380" FOREIGN KEY ("sport_id") REFERENCES "sport"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_customer" ADD CONSTRAINT "FK_f88f3fddda9891bcaebad6b821f" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_image" ADD CONSTRAINT "FK_b439a47c162561ac50ffdf27a9f" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD CONSTRAINT "FK_cdb962bfd50e1d566e15eb547f6" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD CONSTRAINT "FK_85aca11613feff36b630b010b78" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_758630945258337cade1ef75a65" FOREIGN KEY ("administrator_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_dd3d979b6c62d4e5ad3ff2fb44a" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" ADD CONSTRAINT "FK_bc2db60bc54263087e1401ef8a6" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_sports" ADD CONSTRAINT "FK_6ec019662ef92c205ffe14d783f" FOREIGN KEY ("sport_id") REFERENCES "sport"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_sports" ADD CONSTRAINT "FK_2242e5347f848ce107e3ac92df6" FOREIGN KEY ("court_id") REFERENCES "court"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court_sports" DROP CONSTRAINT "FK_2242e5347f848ce107e3ac92df6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_sports" DROP CONSTRAINT "FK_6ec019662ef92c205ffe14d783f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notes" DROP CONSTRAINT "FK_bc2db60bc54263087e1401ef8a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" DROP CONSTRAINT "FK_dd3d979b6c62d4e5ad3ff2fb44a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" DROP CONSTRAINT "FK_758630945258337cade1ef75a65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP CONSTRAINT "FK_85aca11613feff36b630b010b78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP CONSTRAINT "FK_cdb962bfd50e1d566e15eb547f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_image" DROP CONSTRAINT "FK_b439a47c162561ac50ffdf27a9f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_customer" DROP CONSTRAINT "FK_f88f3fddda9891bcaebad6b821f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP CONSTRAINT "FK_ef4ec18ff59ab287c9aa5fa6380"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP CONSTRAINT "FK_24cff6b39c604fc27787de50d07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP CONSTRAINT "FK_4dc1a74828dfda96dc8ba880315"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP CONSTRAINT "FK_b767833f4ce4a69727852b8052b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court" DROP CONSTRAINT "FK_c0bced15a27a93d77da9930366a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court" DROP CONSTRAINT "FK_7164297daa104a52175126a5b81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" DROP CONSTRAINT "FK_b5120f13e1b666149cf5afcd867"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" DROP CONSTRAINT "FK_81d096d802d292d1725710892e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" DROP CONSTRAINT "FK_7018ea79dbfd5fd0133f28aa21d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operating_schedule" DROP CONSTRAINT "FK_5d357511f14e5e1b5df32c540dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_b1735a304045a51b6c271a0cda8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_d1178e34abbbfdbf3065b3385f9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2242e5347f848ce107e3ac92df"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ec019662ef92c205ffe14d783"`,
    );
    await queryRunner.query(`DROP TABLE "court_sports"`);
    await queryRunner.query(`DROP TABLE "google_courts"."google_court"`);
    await queryRunner.query(`DROP TABLE "google_courts"."city"`);
    await queryRunner.query(`DROP TABLE "notes"`);
    await queryRunner.query(`DROP TABLE "person"`);
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TABLE "payment_company"`);
    await queryRunner.query(`DROP TABLE "plan"`);
    await queryRunner.query(`DROP TABLE "company_image"`);
    await queryRunner.query(`DROP TABLE "company_customer"`);
    await queryRunner.query(`DROP TABLE "court_schedule"`);
    await queryRunner.query(`DROP TABLE "court"`);
    await queryRunner.query(`DROP TABLE "type_of_court"`);
    await queryRunner.query(`DROP TABLE "operating_schedule"`);
    await queryRunner.query(`DROP TABLE "sport"`);
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TABLE "day_of_week"`);
  }
}
