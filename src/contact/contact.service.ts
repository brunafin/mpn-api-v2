import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { ContactDto } from './dto/contact.dto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async submit(dto: ContactDto): Promise<{ message: string }> {
    // Honeypot: se preenchido, finge sucesso sem enviar.
    if (dto.website?.trim()) {
      return { message: 'Mensagem enviada. Obrigado pelo contato!' };
    }

    const name = (dto.name ?? '').trim();
    const email = (dto.email ?? '').trim().toLowerCase();
    const phoneDigits = (dto.phone ?? '').replace(/\D/g, '');
    const preferWhatsapp = Boolean(dto.preferWhatsapp);
    const message = (dto.message ?? '').trim();

    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException('Informe um nome válido.');
    }
    if (!EMAIL_RE.test(email) || email.length > 120) {
      throw new BadRequestException('Informe um e-mail válido.');
    }
    if (preferWhatsapp && !phoneDigits) {
      throw new BadRequestException(
        'Informe o telefone para receber retorno pelo WhatsApp.',
      );
    }
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) {
      throw new BadRequestException('Informe um telefone válido com DDD.');
    }
    if (message.length < 10 || message.length > 2000) {
      throw new BadRequestException(
        'A mensagem deve ter entre 10 e 2000 caracteres.',
      );
    }

    try {
      await this.emailService.sendContactFormEmail({
        name,
        email,
        phone: phoneDigits || undefined,
        preferWhatsapp,
        message,
      });
    } catch (err) {
      console.error('Falha no formulário de contato:', err);
      throw new ServiceUnavailableException(
        'Não foi possível enviar sua mensagem agora. Tente de novo em instantes.',
      );
    }

    return { message: 'Mensagem enviada. Obrigado pelo contato!' };
  }
}
