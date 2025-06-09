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
        to: { type: 'string', example: '5189589197' },
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

  @Post('send-template')
  @ApiOperation({ summary: 'Envia uma mensagem via WhatsApp usando Content Template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: '51999999999' },
        contentSid: { type: 'string', example: 'HXxxxxyyyyyyyyyyyyyyyyyyyyyyyyyy' },
        contentVariables: {
          type: 'object',
          example: { "1": "Josephine" }
        },
      },
      required: ['to', 'contentSid', 'contentVariables'],
    },
  })
  @ApiResponse({ status: 201, description: 'Mensagem de template enviada com sucesso!' })
  async sendTemplateMessage(
    @Body() body: { to: string; contentSid: string; contentVariables: Record<string, string> }
  ) {
    await this.twilioService.sendWhatsAppTemplate(
      body.to,
      body.contentSid,
      body.contentVariables
    );
    return { status: 'Mensagem de template enviada com sucesso!' };
  }

  @Post('send-sms')
  @ApiOperation({ summary: 'Envia uma mensagem SMS' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: '51999999999' },
        message: { type: 'string', example: 'Olá, esta é uma mensagem SMS!' },
      },
      required: ['to', 'message'],
    },
  })
  @ApiResponse({ status: 201, description: 'SMS enviado com sucesso!' })
  async sendSms(@Body() body: { to: string; message: string }) {
    await this.twilioService.sendSms(body.to, body.message);
    return { status: 'SMS enviado com sucesso!' };
  }
}
