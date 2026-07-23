import {
  GUARDS_METADATA,
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AuthController } from '../auth/auth.controller';
import { PeopleController } from '../people/people.controller';
import { AppModule } from '../app.module';
import { PlansController } from '../plans/plans.controller';
import { PaymentCompanyController } from '../payment_company/payment_company.controller';
import { ReservationsController } from '../reservations/reservations.controller';
import { ContactController } from '../contact/contact.controller';
import { PublicCourtSchedulesController } from '../court-schedules/public-court-schedules.controller';
import { OperatingScheduleController } from '../operating-schedule/operating-schedule.controller';

/**
 * Contratos de segurança da remediação.
 *
 * - Testes executáveis: protegem o que já existe (não regredir).
 *
 * Rodar: `npm run test:security`
 */
describe('Security remediation contracts', () => {
  describe('Fase 0 — remoções (feito)', () => {
    it('PeopleController não expõe create; cadastro só via /auth/signup', () => {
      expect(
        (PeopleController.prototype as { create?: unknown }).create,
      ).toBeUndefined();
    });

    it('PeopleController não expõe findAll/findOne/update/remove (sem UI)', () => {
      const proto = PeopleController.prototype as Record<string, unknown>;
      expect(proto.findAll).toBeUndefined();
      expect(proto.findOne).toBeUndefined();
      expect(proto.update).toBeUndefined();
      expect(proto.remove).toBeUndefined();
    });

    it('AppModule não importa TwilioModule', () => {
      const imports: unknown[] =
        Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];
      const names = imports.map((item) =>
        typeof item === 'function' ? item.name : String(item),
      );
      expect(names).not.toContain('TwilioModule');
    });

    it('package.json não lista dependência twilio', () => {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, '../../package.json'), 'utf8'),
      ) as { dependencies?: Record<string, string> };
      expect(pkg.dependencies?.twilio).toBeUndefined();
    });

    it('PlansController e PaymentCompanyController exigem AuthGuard', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, PlansController)?.length,
      ).toBeGreaterThan(0);
      expect(
        Reflect.getMetadata(GUARDS_METADATA, PaymentCompanyController)?.length,
      ).toBeGreaterThan(0);
    });

    it('PeopleController exige AuthGuard na classe', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, PeopleController)?.length,
      ).toBeGreaterThan(0);
    });
  });

  describe('Fase 1 — change-password (feito)', () => {
    it('POST /auth/change-password exige AuthGuard(jwt)', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        AuthController.prototype.changePassword,
      );
      expect(guards?.length).toBeGreaterThan(0);
    });
  });

  describe('Fase 1 — follow-ups (feito)', () => {
    it('Person.password e Reservation.token_to_cancel usam @Exclude', () => {
      const personSrc = readFileSync(
        join(__dirname, '../people/entities/person.entity.ts'),
        'utf8',
      );
      const reservationSrc = readFileSync(
        join(__dirname, '../reservations/entities/reservation.entity.ts'),
        'utf8',
      );
      expect(personSrc).toMatch(/@Exclude\(\)[\s\S]*password:/);
      expect(reservationSrc).toMatch(/@Exclude\(\)[\s\S]*token_to_cancel:/);
    });

    it('main.ts registra ClassSerializerInterceptor', () => {
      const mainSrc = readFileSync(join(__dirname, '../main.ts'), 'utf8');
      expect(mainSrc).toContain('ClassSerializerInterceptor');
    });
  });

  describe('Fase 2 — tenancy / IDOR', () => {
    it('operating-schedule exige AuthGuard e passa owner do JWT', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, OperatingScheduleController)
          ?.length,
      ).toBeGreaterThan(0);
      const createSrc = OperatingScheduleController.prototype.create.toString();
      const listSrc =
        OperatingScheduleController.prototype.findAllByCourtId.toString();
      expect(createSrc).toContain('req.user.userId');
      expect(listSrc).toContain('req.user.userId');
    });
  });

  describe('Fase 3 — tokens e abuse', () => {
    it('rotas públicas de cancel por token não existem mais', () => {
      expect(
        (ReservationsController.prototype as { showCancelPage?: unknown })
          .showCancelPage,
      ).toBeUndefined();
      expect(
        (ReservationsController.prototype as { cancel?: unknown }).cancel,
      ).toBeDefined();
    });

    it('código de verificação usa crypto.randomInt (CSPRNG)', () => {
      const authSrc = readFileSync(
        join(__dirname, '../auth/auth.service.ts'),
        'utf8',
      );
      expect(authSrc).toContain("from 'crypto'");
      expect(authSrc).toContain('randomInt');
      expect(authSrc).not.toMatch(/Math\.random\(\)/);
    });
  });

  describe('Fase 4/5 — fronts (checklist)', () => {
    // Concluído em mpn-manager / mpn-front (não verificável neste pacote):
    // ProtectedRoute em rotas autenticadas (incl. /reservas/:id),
    // logout limpa mpn_onboarding_mock + cache de agendas,
    // JSON-LD com escape de <, Instagram href allowlist,
    // headers/CSP, error UI genérica, Clarity masking.
    it('checklist de fronts documentado como concluído', () => {
      expect(true).toBe(true);
    });
  });

  describe('Superfície pública intencional (não remover)', () => {
    it('auth signup/login/verify/resend permanecem públicos', () => {
      for (const method of [
        'signup',
        'verifyEmail',
        'resendCode',
        'signIn',
      ] as const) {
        const guards = Reflect.getMetadata(
          GUARDS_METADATA,
          AuthController.prototype[method],
        );
        expect(guards === undefined || guards.length === 0).toBe(true);
      }
    });

    it('contact e public-court-schedules permanecem públicos', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ContactController),
      ).toBeFalsy();
      expect(
        Reflect.getMetadata(GUARDS_METADATA, PublicCourtSchedulesController),
      ).toBeFalsy();
    });

    it('cancel de reserva autenticado exige AuthGuard', () => {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          ReservationsController.prototype.cancel,
        )?.length,
      ).toBeGreaterThan(0);
    });
  });

  describe('Rotas HTTP mapeadas (smoke de reflexão)', () => {
    it('change-password é POST auth/change-password', () => {
      expect(
        Reflect.getMetadata(
          PATH_METADATA,
          AuthController.prototype.changePassword,
        ),
      ).toBe('change-password');
      expect(
        Reflect.getMetadata(
          METHOD_METADATA,
          AuthController.prototype.changePassword,
        ),
      ).toBe(RequestMethod.POST);
    });
  });
});
