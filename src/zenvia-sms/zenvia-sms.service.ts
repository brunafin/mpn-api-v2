import { Injectable } from '@nestjs/common';
import { Client, TextContent } from '@zenvia/sdk';

@Injectable()
export class ZenviaService {
  private readonly sms: ReturnType<Client['getChannel']>;
  private readonly from: string;

  constructor() {
    const zenviaToken = process.env.ZENVIA_TOKEN;
    const from = process.env.ZENVIA_SMS_FROM;

    if (!zenviaToken || !from) {
      throw new Error(
        'Variáveis de ambiente da Zenvia não configuradas corretamente',
      );
    }

    const client = new Client(zenviaToken);
    this.sms = client.getChannel('sms');
    this.from = from;
  }

  async sendSms(to: string, message: string): Promise<void> {
    try {
      const toFormatted = to.startsWith('+') ? to : `55${to}`;
      const content = new TextContent(message);
      await this.sms.sendMessage(this.from, toFormatted, content);
    } catch (error) {
      throw new Error(
        `Erro ao enviar SMS pela Zenvia: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
    }
  }
}
