import { Injectable } from '@nestjs/common';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio.Twilio;
  private from: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!sid || !token || !from) {
      throw new Error('Twilio environment variables not set properly');
    }

    this.client = Twilio(sid, token);
    this.from = from;
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    try {
      const toFormatted = to.startsWith('whatsapp:+55') ? to : `whatsapp:+55${to}`;
      const fromFormatted = this.from.startsWith('whatsapp:') ? this.from : `whatsapp:${this.from}`;

      await this.client.messages.create({
        body: message,
        from: fromFormatted,
        to: toFormatted,
      });
    } catch (error) {
      throw new Error(`Ocorreu um erro ao enviar mensagem de aviso para o cliente: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
