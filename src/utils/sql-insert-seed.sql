INSERT INTO
  web.day_of_week (abbreviation, description, ref)
VALUES
  ('SEG', 'Segunda-feira', 1),
  ('TER', 'Terça-feira', 2),
  ('QUA', 'Quarta-feira', 3),
  ('QUI', 'Quinta-feira', 4),
  ('SEX', 'Sexta-feira', 5),
  ('SAB', 'Sábado', 6),
  ('DOM', 'Domingo', 7);

INSERT INTO
  web.type_of_court (name, description)
VALUES
  ('Futsal', 'Quadra de futsal'),
  ('Beach Vôlei', 'Quadra de beach vôlei'),
  ('Society', 'Campo de futebol society');

INSERT INTO
  web.person (
    created_at,
    updated_at,
    name,
    phone,
    email,
    cpf,
    born_date,
    cep,
    street,
    number,
    city,
    neighborhood,
    uf,
    status
  )
VALUES
  (
    '2023-10-01 12:00:00',
    '2023-10-01 12:00:00',
    'João Silva',
    '11999999999',
    'joao.silva@example.com',
    '12345678901',
    '1980-01-01',
    '12345678',
    'Rua Exemplo',
    '123',
    'Gravataí',
    'Centro',
    'RS',
    true
  );

INSERT INTO
  web.company (
    created_at,
    updated_at,
    name,
    phone,
    instagram_url,
    facebook_url,
    email,
    cep,
    street,
    number,
    city,
    neighborhood,
    uf,
    administrator_id
  )
VALUES
  (
    '2023-10-01 12:00:00',
    '2023-10-01 12:00:00',
    'Empresa Exemplo',
    '11999999999',
    'https://instagram.com/empresa',
    'https://facebook.com/empresa',
    'contato@empresa.com',
    '12345678',
    'Rua Exemplo',
    '123',
    'São Paulo',
    'Centro',
    'SP',
    1
  );

INSERT INTO
  web.court (name, company_id, type_of_court_id, show)
VALUES
  ('Nena A', 1, 1, true);

INSERT INTO
  web.operating_schedule (hour, price, day_of_week_id, court_id)
VALUES
  (18, 50.00, 1, 1),
  (19, 55.00, 1, 1),
  (20, 60.00, 1, 1);

INSERT INTO
  web.court_schedule (
    start_hour,
    end_hour,
    date,
    available,
    price,
    court_id,
    day_of_week_id
  )
VALUES
  ('08:00', '10:00', '2023-10-01', true, 50.00, 1, 1);