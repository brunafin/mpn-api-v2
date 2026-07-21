import { MigrationInterface, QueryRunner } from "typeorm";

export class CourtFloor1784599025540 implements MigrationInterface {
    name = 'CourtFloor1784599025540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "court" ADD "floor" character varying(30)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "court" DROP COLUMN "floor"`);
    }

}
