import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
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

  @ApiProperty({
    example: '52998224725',
    description: 'CPF do responsável (11 dígitos). Usado no PIX das mensalidades.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve ter 11 dígitos.',
  })
  cpf: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({
    example: true,
    description: 'Aceite dos Termos de Uso e da Política de Privacidade.',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, {
    message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.',
  })
  acceptedTerms: boolean;
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

export class ForgotPasswordDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código deve ter 6 dígitos.' })
  code: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
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

export class GoogleAuthDto {
  @ApiProperty({
    description: 'ID token (JWT) retornado pelo Google Identity Services',
  })
  @IsString()
  @MinLength(20)
  idToken: string;

  @ApiPropertyOptional({
    description:
      'Senha da conta local — obrigatória para vincular Google a e-mail já cadastrado com senha',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password?: string;
}

export class CompleteProfileDto {
  @ApiPropertyOptional({
    example: '51999999999',
    description: 'Telefone de contato (opcional).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve ter 10 ou 11 dígitos.',
  })
  phone?: string;

  @ApiProperty({
    example: '52998224725',
    description: 'CPF do responsável (11 dígitos). Usado no PIX das mensalidades.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve ter 11 dígitos.',
  })
  cpf: string;

  @ApiProperty({
    example: true,
    description: 'Aceite dos Termos de Uso e da Política de Privacidade.',
  })
  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, {
    message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.',
  })
  acceptedTerms: boolean;
}
