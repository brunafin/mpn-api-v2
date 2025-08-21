import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado';
    let errorDetails: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObject = exceptionResponse as any;

        // ✅ Tratamento especial para 401
        if (status === HttpStatus.UNAUTHORIZED) {
          // se a mensagem default for "Unauthorized", então é token expirado
          if (
            responseObject.message === 'Unauthorized' ||
            responseObject.message === 'jwt expired' ||
            responseObject.message === 'invalid token'
          ) {
            message = 'Acesso expirado';
          } else {
            // se for outro Unauthorized, mantém a mensagem que você definiu
            message = responseObject.message ?? message;
          }
        } else {
          // outros erros normais
          message = responseObject.message ?? message;
        }

        errorDetails = responseObject.error ?? null;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = exception.stack ?? null;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: errorDetails,
      timestamp: new Date().toISOString(),
    });
  }
}
