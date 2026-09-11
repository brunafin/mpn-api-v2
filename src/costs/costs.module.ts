import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostsController } from './costs.controller';
import { CostsService } from './costs.service';
import { PlatformCost } from './entities/platform-cost.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformCost])],
  controllers: [CostsController],
  providers: [CostsService],
})
export class CostsModule {}
