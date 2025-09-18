import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { WhatsAppController } from './twilio.controller';

@Module({
  controllers: [WhatsAppController],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class TwilioModule {}
