import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CompanyImage } from '../company-images/entities/company-image.entity';
import { StorageService } from '../storage/storage.service';
import { PublicListingCache } from '../cache/public-listing.cache';

/**
 * Regressão da tenancy que JÁ existe (logo/fotos).
 * Na Fase 2 o mesmo padrão deve se espalhar para infos/schedules/etc.
 */
describe('CompaniesService ownership (regression)', () => {
  let service: CompaniesService;
  let companiesRepository: Record<string, jest.Mock>;
  let companyImageRepository: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;
  let publicListingCache: Record<string, jest.Mock>;

  const ownerCompany = {
    id: 10,
    public_id: 'company-a',
    administrator: { public_id: 'owner-a' },
  };

  beforeEach(async () => {
    companiesRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    companyImageRepository = {
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    storageService = {
      isConfigured: jest.fn().mockReturnValue(true),
      companyPhotoKey: jest.fn().mockReturnValue('key'),
      companyLogoKey: jest.fn().mockReturnValue('logo-key'),
      uploadObject: jest.fn().mockResolvedValue('https://cdn/x.webp'),
      deleteObject: jest.fn(),
      keyFromPublicUrl: jest.fn().mockReturnValue('key'),
    };
    publicListingCache = {
      invalidateAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: companiesRepository,
        },
        {
          provide: getRepositoryToken(CompanyImage),
          useValue: companyImageRepository,
        },
        { provide: StorageService, useValue: storageService },
        { provide: PublicListingCache, useValue: publicListingCache },
      ],
    }).compile();

    service = module.get(CompaniesService);
  });

  describe('listPhotos', () => {
    it('lista fotos quando o JWT é o administrador dono', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);
      companyImageRepository.find.mockResolvedValue([
        { id: 1, url: 'https://cdn/1.webp' },
      ]);

      const result = await service.listPhotos('company-a', 'owner-a');

      expect(result).toEqual([{ id: 1, url: 'https://cdn/1.webp' }]);
      expect(companiesRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { public_id: 'company-a' },
          relations: ['administrator'],
        }),
      );
    });

    it('retorna 403 quando outro dono tenta listar fotos', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);

      await expect(
        service.listPhotos('company-a', 'owner-b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(companyImageRepository.find).not.toHaveBeenCalled();
    });

    it('retorna 404 quando a empresa não existe', async () => {
      companiesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.listPhotos('missing', 'owner-a'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findSchedulesByDate / findInfosByPublicId', () => {
    it('bloqueia agenda cross-tenant', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);
      await expect(
        service.findSchedulesByDate('company-a', '2026-07-22', 'owner-b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloqueia infos cross-tenant', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);
      await expect(
        service.findInfosByPublicId('company-a', 'owner-b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloqueia update cross-tenant', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);
      await expect(
        service.updateByPublicId('company-a', { name: 'Hack' }, 'owner-b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deletePhoto', () => {
    it('impede delete cross-tenant antes de tocar no storage', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);

      await expect(
        service.deletePhoto('company-a', 'owner-b', 99),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(companyImageRepository.findOne).not.toHaveBeenCalled();
      expect(storageService.deleteObject).not.toHaveBeenCalled();
    });

    it('apaga foto do próprio estabelecimento', async () => {
      companiesRepository.findOne.mockResolvedValue(ownerCompany);
      companyImageRepository.findOne.mockResolvedValue({
        id: 99,
        url: 'https://cdn/99.webp',
        company_id: 10,
      });
      companyImageRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(
        service.deletePhoto('company-a', 'owner-a', 99),
      ).resolves.toEqual({ ok: true });
      expect(companyImageRepository.delete).toHaveBeenCalledWith(99);
      expect(storageService.deleteObject).toHaveBeenCalled();
    });
  });
});
