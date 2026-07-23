import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiPropertyOptional({ example: '51999999999' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve ter 10 ou 11 dígitos.',
  })
  phone?: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código deve ter 6 dígitos.' })
  code: string;
}

export class ResendCodeDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;

  @ApiPropertyOptional({
    description: 'Obrigatório se a senha atual não for a padrão.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword?: string;
}

export class SignInDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
