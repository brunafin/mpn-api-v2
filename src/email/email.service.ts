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
  tokenToCancel: string;
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

          <p style="margin-top: 20px;">
              <a href="${process.env.LINK_TO_CANCEL}${createEmailDto.tokenToCancel}"
                  style="
                  color: #ffffff;
                  background-color: #d9534f;
                  padding: 12px 20px;
                  border-radius: 8px;
                  font-weight: bold;
                  text-decoration: none;
                  display: inline-block;">
                  Cancelar Reserva
              </a>
          </p>
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

  async sendEmailNewReservation({
    courtEmail,
    courtName,
    contactName,
    contactPhone,
    date,
    time,
    amount,
    tokenToCancel,
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
      tokenToCancel,
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
