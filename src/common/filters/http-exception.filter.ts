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
    let message: string | Record<string, unknown> = 'Ocorreu um erro inesperado';
    let errorDetails: string | null = null;
    let code: string | null = null;
    let missing: string[] | null = null;
    let email: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObject = exceptionResponse as Record<string, unknown>;

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
            message =
              (responseObject.message as string | Record<string, unknown>) ??
              message;
          }
        } else {
          // outros erros normais
          message =
            (responseObject.message as string | Record<string, unknown>) ??
            message;
        }

        if (typeof responseObject.code === 'string') {
          code = responseObject.code;
        }
        if (
          Array.isArray(responseObject.missing) &&
          responseObject.missing.every((item) => typeof item === 'string')
        ) {
          missing = responseObject.missing as string[];
        }
        if (typeof responseObject.email === 'string') {
          email = responseObject.email;
        }
        errorDetails =
          typeof responseObject.error === 'string'
            ? responseObject.error
            : null;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      if (process.env.TYPE_ENV !== 'production') {
        errorDetails = exception.stack ?? null;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(code ? { code } : {}),
      ...(missing ? { missing } : {}),
      ...(email ? { email } : {}),
      ...(errorDetails ? { error: errorDetails } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
