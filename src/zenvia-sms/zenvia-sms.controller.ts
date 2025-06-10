import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ZenviaService } from './zenvia-sms.service'; // Altere aqui
import { AuthGuard } from '@nestjs/passport';

// @UseGuards(AuthGuard('jwt'))
// @ApiBearerAuth()
@ApiTags('zenvia')
@Controller('zenvia')
export class ZenviaController {
  constructor(private readonly zenviaService: ZenviaService) { }

  @Post('send-sms')
  @ApiOperation({ summary: 'Envia uma mensagem SMS via Zenvia' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: '51999999999' },
        message: { type: 'string', example: 'Olá, esta é uma mensagem SMS da Zenvia!' },
      },
      required: ['to', 'message'],
    },
  })
  @ApiResponse({ status: 201, description: 'SMS enviado com sucesso!' })
  async sendSms(@Body() body: { to: string; message: string }) {
    await this.zenviaService.sendSms(body.to, body.message);
    return { status: 'SMS enviado com sucesso!' };
  }
}
