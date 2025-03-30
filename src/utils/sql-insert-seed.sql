INSERT INTO
  day_of_week (abbreviation, description, ref)
VALUES
  ('SEG', 'Segunda-feira', 1),
  ('TER', 'Terça-feira', 2),
  ('QUA', 'Quarta-feira', 3),
  ('QUI', 'Quinta-feira', 4),
  ('SEX', 'Sexta-feira', 5),
  ('SAB', 'Sábado', 6),
  ('DOM', 'Domingo', 0);

INSERT INTO
  type_of_court (name, description)
VALUES
  ('Futsal', 'Quadra de salão'),
  ('Beach', 'Quadra de areia'),
  ('Society', 'Quadra de grama sintética society');

INSERT INTO
  person (
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
  company (
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
    'Nena Esportes',
    '51999365300',
    'https://instagram.com/marcapranos',
    'https://facebook.com/marcapranos',
    'nenaesportes@outlook.com',
    '94090000',
    'Rua das Quadras',
    '123',
    'Gravataí',
    'Centro',
    'RS',
    1
  );

INSERT INTO
  court (name, company_id, note_stars, type_of_court_id, show)
VALUES
  ('Quadra A', 1, null, 1, true),
  ('Quadra B', 1, 5, 1, true),
  ('Quadra C', 1, 3.5, 1, true),
  ('Quadra D', 1, 0, 1, true);

INSERT INTO
  operating_schedule (hour, price, day_of_week_id, court_id)
VALUES
  ('10:00', 50.00, 1, 1),
  ('19:00', 55.00, 2, 1),
  ('20:00', 60.00, 3, 1);

INSERT INTO
  court_schedule (
    start_hour,
    end_hour,
    date,
    available,
    price,
    court_id,
    day_of_week_id
  )
VALUES
  ('10:00', '11:00', '2025-10-01', true, 50.00, 1, 1);


SELECT * FROM day_of_week;
SELECT * FROM type_of_court;
SELECT * FROM person;
SELECT * FROM company;
SELECT * FROM court;
SELECT * FROM operating_schedule;
SELECT * FROM court_schedule;