import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  });

  await client.connect();
  await client.end();
}

export default createDatabaseIfNotExists;
