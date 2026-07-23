import { instanceToPlain } from 'class-transformer';
import { Person } from '../people/entities/person.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

describe('Sensitive fields serialization', () => {
  it('Person.password nunca aparece no JSON serializado', () => {
    const person = Object.assign(new Person(), {
      id: 1,
      public_id: 'person-uuid',
      name: 'Ana',
      username: 'ana',
      email: 'ana@example.com',
      password: 'bcrypt-hash-secret',
      status: true,
    });

    const plain = instanceToPlain(person) as Record<string, unknown>;
    expect(plain.password).toBeUndefined();
    expect(plain.name).toBe('Ana');
    expect(plain.public_id).toBe('person-uuid');
  });

  it('Reservation.token_to_cancel nunca aparece no JSON serializado', () => {
    const reservation = Object.assign(new Reservation(), {
      id: 9,
      public_id: 'res-uuid',
      contact_name: 'Cliente',
      contact_phone: '51999999999',
      token_to_cancel: 'legacy-jwt-should-not-leak',
      sport_id: 1,
      court_schedule_id: 2,
    });

    const plain = instanceToPlain(reservation) as Record<string, unknown>;
    expect(plain.token_to_cancel).toBeUndefined();
    expect(plain.contact_name).toBe('Cliente');
    expect(plain.public_id).toBe('res-uuid');
  });
});
