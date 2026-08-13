import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';

describe('CourtsController', () => {
  let controller: CourtsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtsController],
      providers: [CourtsService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CourtsController>(CourtsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /courts legado retorna 410', () => {
    expect(() =>
      controller.create({} as CreateCourtDto, { user: { userId: 'owner-1' } }),
    ).toThrow(GoneException);
  });
});
