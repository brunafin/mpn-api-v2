import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly secretKey: string;

  constructor() {
    const secret = process.env.JWT_SECRET_TOKEN_TO_CANCEL;
    if (!secret) {
      throw new Error(
        'JWT_SECRET_TOKEN_TO_CANCEL environment variable is not defined',
      );
    }
    this.secretKey = secret;
  }

  generateToken(reservationId: number): string {
    const payload = { reservationId, date: new Date() };
    const options = {};
    return jwt.sign(payload, this.secretKey, options);
  }
}
