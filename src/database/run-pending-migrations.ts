import { AppDataSource } from './data-source';
import { shouldRunMigrationsOnBoot } from './typeorm.config';

/**
 * Aplica o que ainda não está na tabela de migrations e solta a conexão.
 * O Nest abre a própria em seguida. Se a Railway ignorar o CMD da imagem,
 * este passo ainda roda, porque está no processo que escuta.
 */
export async function runPendingMigrations(): Promise<void> {
  if (!shouldRunMigrationsOnBoot()) return;

  await AppDataSource.initialize();
  try {
    const applied = await AppDataSource.runMigrations();
    const names = applied.map((migration) => migration.name);
    console.log(
      names.length
        ? `Migrations aplicadas: ${names.join(', ')}`
        : 'Migrations: nenhuma pendente',
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}
