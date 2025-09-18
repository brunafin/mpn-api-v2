import { Module } from '@nestjs/common';
import { ZenviaService } from './zenvia-sms.service';
import { ZenviaController } from './zenvia-sms.controller';

@Module({
  controllers: [ZenviaController],
  providers: [ZenviaService],
  exports: [ZenviaService],
})
export class ZenviaModule {}
