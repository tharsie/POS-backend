import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    
    // Log unexpected internal server errors to the console so they show in PM2 logs
    if (!isHttp || status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Unhandled Exception:', exception);
    }

    const body = isHttp ? exception.getResponse() : undefined;
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as { message: string | string[] }).message
        : isHttp
          ? exception.message
          : 'Internal server error';
    const code =
      typeof body === 'object' && body !== null && 'code' in body
        ? String((body as { code: string }).code)
        : status === 500
          ? 'INTERNAL_SERVER_ERROR'
          : 'REQUEST_ERROR';

    response.status(status).json({
      success: false,
      error: {
        code,
        message: Array.isArray(message) ? 'Validation failed' : message,
        details: Array.isArray(message) ? message : [],
        ...(this.config.get<string>('app.nodeEnv') !== 'production' && !isHttp
          ? { debug: exception instanceof Error ? exception.message : String(exception) }
          : {}),
      },
    });
  }
}
