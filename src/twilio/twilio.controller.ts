import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwilioService } from './twilio.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly twilioService: TwilioService) { }

  @Post('send')
  @ApiOperation({ summary: 'Envia uma mensagem via WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: '+555189589197' },
        message: { type: 'string', example: 'Olá, sua reserva está confirmada!' },
      },
      required: ['to', 'message'],
    },
  })
  @ApiResponse({ status: 201, description: 'Mensagem enviada com sucesso!' })
  async sendMessage(@Body() body: { to: string; message: string }) {
    await this.twilioService.sendWhatsApp(body.to, body.message);
    return { status: 'Mensagem enviada com sucesso!' };
  }
}
