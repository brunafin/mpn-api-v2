import { Injectable } from '@nestjs/common';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio.Twilio;
  private from_whatsapp: string;
  private from_sms: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from_whatsapp = process.env.TWILIO_WHATSAPP_FROM;
    const from_sms = process.env.TWILIO_SMS_FROM;

    if (!sid || !token || !from_whatsapp || !from_sms) {
      throw new Error('Twilio environment variables not set properly');
    }

    this.client = Twilio(sid, token);
    this.from_whatsapp = from_whatsapp;
    this.from_sms = from_sms;
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    try {
      const toFormatted = to.startsWith('whatsapp:+55') ? to : `whatsapp:+55${to}`;
      const fromFormatted = this.from_whatsapp.startsWith('whatsapp:') ? this.from_whatsapp : `whatsapp:${this.from_whatsapp}`;

      await this.client.messages.create({
        body: message,
        from: fromFormatted,
        to: toFormatted,
      });
    } catch (error) {
      throw new Error(`Ocorreu um erro ao enviar mensagem de aviso para o cliente: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sendWhatsAppTemplate(
    to: string,
    contentSid: string,
    contentVariables: Record<string, string>
  ): Promise<void> {
    try {
      const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:+55${to}`;
      const fromFormatted = this.from_whatsapp.startsWith('whatsapp:') ? this.from_whatsapp : `whatsapp:${this.from_whatsapp}`;

      await this.client.messages.create({
        from: fromFormatted,
        to: toFormatted,
        contentSid,
        contentVariables: JSON.stringify(contentVariables),
      });
    } catch (error) {
      throw new Error(
        `Ocorreu um erro ao enviar mensagem de template para o cliente: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async sendSms(to: string, message: string): Promise<void> {
    console.log(`Enviando SMS para: ${to}, mensagem: ${message}`);
    try {
      const toFormatted = to.startsWith('+') ? to : `+55${to}`;
      await this.client.messages.create({
        body: message,
        from: this.from_sms,
        to: toFormatted,
      });
    } catch (error) {
      throw new Error(
        `Ocorreu um erro ao enviar SMS para o cliente: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
