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
    let message = 'Ocorreu um erro';
    let errorDetails: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorDetails = (exceptionResponse as any).error || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = exception.stack || null;

      const errorMessages: Record<number, string> = {
        [HttpStatus.INTERNAL_SERVER_ERROR]: 'Ocorreu um erro no servidor.',
        [HttpStatus.BAD_REQUEST]: 'Os dados enviados são inválidos!',
        [HttpStatus.UNAUTHORIZED]:
          'Você não tem permissão para acessar este recurso!',
        [HttpStatus.FORBIDDEN]: 'Acesso negado!',
        [HttpStatus.NOT_FOUND]: 'O recurso solicitado não foi encontrado!',
        [HttpStatus.CONFLICT]: 'Conflito nos dados enviados!',
      };

      message = errorMessages[status] || message;

      response.status(status).json({
        statusCode: status,
        message,
        error: errorDetails,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
