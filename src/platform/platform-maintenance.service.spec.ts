import { PlatformMaintenanceService } from './platform-maintenance.service';
import { PlatformSetting } from './entities/platform-setting.entity';

function row(partial: Partial<PlatformSetting> = {}): PlatformSetting {
  return {
    id: 1,
    maintenance_enabled: false,
    maintenance_message: null,
    delinquency_block_after_days: 10,
    updated_at: new Date('2026-10-22T12:00:00.000Z'),
    ...partial,
  };
}

describe('PlatformMaintenanceService', () => {
  function setup(existing: PlatformSetting | null) {
    const repo = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((value: Partial<PlatformSetting>) => value),
      save: jest.fn(async (value: PlatformSetting) =>
        row({
          ...value,
          updated_at: new Date('2026-10-22T15:00:00.000Z'),
        }),
      ),
    };
    const service = new PlatformMaintenanceService(repo as never);
    return { service, repo };
  }

  it('cria a linha única quando ainda não existe', async () => {
    const { service, repo } = setup(null);

    const view = await service.get();

    expect(repo.create).toHaveBeenCalledWith({
      id: 1,
      maintenance_enabled: false,
      maintenance_message: null,
      delinquency_block_after_days: 10,
    });
    expect(view).toEqual({
      maintenance: false,
      message: null,
      updatedAt: new Date('2026-10-22T15:00:00.000Z'),
    });
  });

  it('liga a manutenção e guarda a mensagem sem espaços nas pontas', async () => {
    const { service } = setup(row());

    const view = await service.update({
      maintenance: true,
      message: '  Voltamos às 18h.  ',
    });

    expect(view.maintenance).toBe(true);
    expect(view.message).toBe('Voltamos às 18h.');
  });

  it('mensagem vazia limpa o texto', async () => {
    const { service, repo } = setup(
      row({ maintenance_enabled: true, maintenance_message: 'Texto atual' }),
    );

    const cleared = await service.update({ maintenance: true, message: '   ' });

    expect(cleared.message).toBeNull();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ maintenance_message: null }),
    );
  });

  it('omitir a mensagem preserva o texto anterior', async () => {
    const { service, repo } = setup(
      row({ maintenance_enabled: true, maintenance_message: 'Texto atual' }),
    );

    await service.update({ maintenance: false });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        maintenance_enabled: false,
        maintenance_message: 'Texto atual',
      }),
    );
  });
});
