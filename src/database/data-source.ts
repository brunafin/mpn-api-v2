import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

dotenv.config();

/**
 * DataSource usado exclusivamente pela CLI do TypeORM (migration:generate,
 * migration:run, migration:revert). A aplicação Nest usa buildTypeOrmOptions
 * diretamente via TypeOrmModule.forRoot.
 */
export const AppDataSource = new DataSource(buildTypeOrmOptions());
