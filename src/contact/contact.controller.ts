import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
@ApiTags('contact')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Formulário de contato do site público' })
  submit(@Body() body: ContactDto) {
    return this.contactService.submit(body);
  }
}
