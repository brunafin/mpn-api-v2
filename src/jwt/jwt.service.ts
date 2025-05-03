import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly secretKey = process.env.JWT_SECRET;

  generateToken(reservationId: number): string {
    const payload = { reservationId, date: new Date() };
    const options = {};
    return jwt.sign(payload, this.secretKey, options);
  }
}
