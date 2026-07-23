import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

interface CreateEmailDto {
  courtName: string;
  courtEmail: string;
  contactName: string;
  contactPhone: string;
  time: string;
  date: string;
  amount: string;
  subjectPrefix: string;
}

interface SendCanceledReservationEmailDto {
  companyName: string;
  courtName: string;
  courtEmail: string;
  contactName: string;
  contactPhone: string;
  time: string;
  date: string;
  subjectPrefix: string;
}

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.EMAIL_RESEND_API_KEY);
  }

  private generateNewReservationEmailHtml(
    createEmailDto: CreateEmailDto,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Marca pra Nós</title>
      </head>
      <body style="font-family: sans-serif; text-align: center;">
          <h1>Nova reserva - ${createEmailDto.courtName}</h1>
          <p><strong>Quando?</strong> ${createEmailDto.date}</p>
          <p><strong>Que horas?</strong> ${createEmailDto.time}</p>
          <p><strong>Em nome de:</strong> ${createEmailDto.contactName} - ${createEmailDto.contactPhone}</p>
          <p><strong>Valor:</strong> ${createEmailDto.amount}</p>
      </body>
      </html>
    `;
  }

  private generateCanceledReservationEmailHtml({
    companyName,
    contactName,
    contactPhone,
    courtName,
    date,
    time,
  }: SendCanceledReservationEmailDto): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reserva Cancelada</title>
    </head>
    <body style="font-family: sans-serif; text-align: center;">
      <h1>Reserva Cancelada - ${companyName}</h1>
      <p>Informamos que a reserva foi cancelada.</p>
      <p><strong>Detalhes da Reserva:</strong></p>
      <p><strong>Quadra:</strong> ${courtName}</p>
      <p><strong>Data:</strong> ${date}</p>
      <p><strong>Hora:</strong> ${time}</p>
      <p><strong>Quadra:</strong> ${courtName}</p>
      <p><strong>Contato:</strong> ${contactName} - ${contactPhone}
      <br/>
      <a href="https://web.whatsapp.com/send?phone=${contactPhone}"
        style="
          display: inline-block;
          background-color: #25D366;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 10px;
        ">
        Enviar mensagem no WhatsApp
      </a>

      <p>Atenciosamente,</p>
      <p>Equipe Marca pra Nós</p>
    </body>
    </html>
    `;
  }

  private async sendResendEmail(
    createEmailDto: CreateEmailDto | SendCanceledReservationEmailDto,
    template: string,
  ): Promise<string> {
    try {
      await this.resend.emails.send({
        from: `Marca pra Nós <${process.env.EMAIL_FROM}>`,
        to: createEmailDto.courtEmail,
        subject: `${createEmailDto.subjectPrefix} - ${createEmailDto.courtName} - ${createEmailDto.contactName} - ${createEmailDto.time}`,
        html: template,
      });
      return 'E-mail enviado com sucesso';
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    }
  }

  private generateVerificationCodeEmailHtml(code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmação de cadastro - Marca pra Nós</title>
      </head>
      <body style="font-family: sans-serif; text-align: center; color: #1a1a1a;">
          <h1>Confirme seu cadastro</h1>
          <p>Use o código abaixo para confirmar seu e-mail. Ele expira em 15 minutos.</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
            ${code}
          </p>
          <p style="color: #666;">Se você não solicitou este cadastro, ignore este e-mail.</p>
          <p>Equipe Marca pra Nós</p>
      </body>
      </html>
    `;
  }

  async sendVerificationCodeEmail(to: string, code: string): Promise<string> {
    try {
      await this.resend.emails.send({
        from: `Marca pra Nós <${process.env.EMAIL_FROM}>`,
        to,
        subject: 'Seu código de confirmação - Marca pra Nós',
        html: this.generateVerificationCodeEmailHtml(code),
      });
      return 'E-mail de verificação enviado com sucesso';
    } catch (error) {
      console.error('Erro ao enviar e-mail de verificação:', error);
      throw new Error(
        `Falha ao enviar e-mail de verificação: ${error.message}`,
      );
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async sendContactFormEmail(input: {
    name: string;
    email: string;
    phone?: string;
    preferWhatsapp?: boolean;
    message: string;
  }): Promise<string> {
    const to =
      process.env.CONTACT_TO_EMAIL?.trim() || 'contato@marcapranos.com.br';
    const name = this.escapeHtml(input.name);
    const email = this.escapeHtml(input.email);
    const phone = input.phone ? this.escapeHtml(input.phone) : '';
    const message = this.escapeHtml(input.message).replace(/\n/g, '<br>');
    const preferWhatsapp = Boolean(input.preferWhatsapp);

    try {
      await this.resend.emails.send({
        from: `Marca pra Nós <${process.env.EMAIL_FROM}>`,
        to,
        replyTo: input.email,
        subject: `Contato pelo site — ${input.name}`,
        html: `
          <!DOCTYPE html>
          <html lang="pt">
          <head><meta charset="UTF-8" /></head>
          <body style="font-family: sans-serif; color: #1a1a1a; line-height: 1.5;">
            <h1 style="font-size: 18px;">Nova mensagem pelo site</h1>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>E-mail:</strong> ${email}</p>
            ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
            <p><strong>Retorno por WhatsApp:</strong> ${preferWhatsapp ? 'Sim' : 'Não'}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${message}</p>
          </body>
          </html>
        `,
      });
      return 'E-mail de contato enviado com sucesso';
    } catch (error) {
      console.error('Erro ao enviar e-mail de contato:', error);
      throw new Error(
        `Falha ao enviar e-mail de contato: ${error.message}`,
      );
    }
  }

  async sendEmailNewReservation({
    courtEmail,
    courtName,
    contactName,
    contactPhone,
    date,
    time,
    amount,
    subjectPrefix,
  }: CreateEmailDto) {
    const createEmailDto: CreateEmailDto = {
      courtEmail,
      courtName,
      contactName,
      contactPhone,
      time,
      date,
      amount,
      subjectPrefix,
    };

    return this.sendResendEmail(
      createEmailDto,
      this.generateNewReservationEmailHtml(createEmailDto),
    );
  }

  async sendEmailCanceledReservation({
    companyName,
    contactName,
    contactPhone,
    courtEmail,
    courtName,
    date,
    time,
    subjectPrefix,
  }: SendCanceledReservationEmailDto) {
    const cancelEmailDto: SendCanceledReservationEmailDto = {
      companyName,
      contactName,
      contactPhone,
      courtEmail,
      courtName,
      date,
      time,
      subjectPrefix,
    };

    return this.sendResendEmail(
      cancelEmailDto,
      this.generateCanceledReservationEmailHtml(cancelEmailDto),
    );
  }
}
