import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ example: '51999999999', required: false })
  phone?: string;

  @ApiProperty({ example: 'Senha@123' })
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ example: '123456' })
  code: string;
}

export class ResendCodeDto {
  @ApiProperty({ example: 'joao@email.com' })
  email: string;
}
