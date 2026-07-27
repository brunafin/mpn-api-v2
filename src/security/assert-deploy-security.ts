import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

type PackageJson = {
  dependencies?: Record<string, string>;
  name?: string;
};

/**
 * Resolve package.json do mpn-api tanto em `src/` (ts-jest/ts-node)
 * quanto em `dist/` ou `dist/src/` (nest build).
 */
function resolveApiPackageJsonPath(): string {
  const starts = [process.cwd(), __dirname];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      const candidate = join(dir, 'package.json');
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as PackageJson;
        if (pkg.dependencies?.['@nestjs/core']) {
          return candidate;
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error(
    'Deploy bloqueado: package.json do mpn-api não encontrado (assertDeploySecurityGuards).',
  );
}

/**
 * Falha rápido no boot se o deploy estiver inseguro:
 * - Twilio não pode estar nas dependencies
 * - Em production, MERCADOPAGO_WEBHOOK_SECRET é obrigatório
 */
export function assertDeploySecurityGuards(): void {
  const pkg = JSON.parse(
    readFileSync(resolveApiPackageJsonPath(), 'utf8'),
  ) as PackageJson;

  if (pkg.dependencies?.twilio) {
    throw new Error(
      'Deploy bloqueado: dependência "twilio" presente. Remova do package.json.',
    );
  }

  const isProduction = process.env.TYPE_ENV === 'production';
  if (isProduction) {
    const mpSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
    if (!mpSecret) {
      throw new Error(
        'Deploy bloqueado: MERCADOPAGO_WEBHOOK_SECRET é obrigatório em production.',
      );
    }
  }
}
