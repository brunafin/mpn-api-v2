/**
 * Contas fixas do seed de dev/e2e. Senhas de teste, já versionadas no seed
 * de desenvolvimento — não são segredo de produção.
 * O login só exige troca de senha quando a senha coincide com DEFAULT_PASSWORD.
 * A API de e2e sobe com DEFAULT_PASSWORD = E2E_DEFAULT_PASSWORD.
 */
export const E2E_PASSWORD = 'Admin@123';
export const E2E_DEFAULT_PASSWORD = 'Mudar@123';
export const E2E_NEW_PASSWORD = 'E2eNova@123';

export const E2E_ACCOUNTS = {
  admin: {
    name: 'Admin MPN',
    username: 'mpn',
    email: 'mpn@mpn.dev',
    phone: '51999990000',
    password: E2E_PASSWORD,
    role: 'platform_admin',
  },
  manager: {
    name: 'Gestor Arena',
    username: 'manager',
    email: 'manager@mpn.dev',
    phone: '51999990001',
    password: E2E_PASSWORD,
    role: 'owner',
  },
  trial: {
    name: 'Gestor Trial',
    username: 'trial',
    email: 'trial@mpn.dev',
    phone: '51999990003',
    password: E2E_PASSWORD,
    role: 'owner',
  },
  readonly: {
    name: 'Gestor Leitura',
    username: 'readonly',
    email: 'readonly@mpn.dev',
    phone: '51999990004',
    password: E2E_PASSWORD,
    role: 'owner',
  },
  mustChange: {
    name: 'Gestor Senha',
    username: 'mustchange',
    email: 'mustchange@mpn.dev',
    phone: '51999990005',
    password: E2E_DEFAULT_PASSWORD,
    role: 'owner',
  },
  pending: {
    name: 'Gestor Pendente',
    username: 'pendente',
    email: 'pendente@mpn.dev',
    phone: '51999990008',
    password: E2E_PASSWORD,
    role: 'owner',
  },
  seller: {
    name: 'Vendedor E2E',
    username: 'seller',
    email: 'seller@mpn.dev',
    phone: '51999990006',
    password: E2E_PASSWORD,
    role: 'representative',
  },
} as const;

export const E2E_COMPANIES = {
  main: { name: 'Arena Dev', slug: 'arena-dev' },
  trial: { name: 'Arena Trial', slug: 'arena-trial' },
  readonly: { name: 'Arena Leitura', slug: 'arena-leitura' },
  mustChange: { name: 'Arena Senha', slug: 'arena-senha' },
  pending: { name: 'Arena Pendente', slug: 'arena-pendente' },
} as const;

export const E2E_PAST_CONTACT = 'Cliente Passado';
