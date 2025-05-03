import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const dbName = process.env.POSTGRES_DB;

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  });

  await client.connect();
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE $1`, [dbName]);
  }

  await client.end();
}

export default createDatabaseIfNotExists;
