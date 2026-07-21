import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ResendCodeDto, SignupDto, VerifyEmailDto } from './dto/signup.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  @ApiOperation({ summary: 'Cadastro do dono (cria conta inativa e envia código por e-mail)' })
  @ApiResponse({ status: 201, description: 'Cadastro criado, código enviado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  signup(@Body() body: SignupDto) {
    return this.authService.signup(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({ summary: 'Confirma o e-mail com o código recebido' })
  @ApiResponse({ status: 200, description: 'E-mail confirmado' })
  @ApiResponse({ status: 400, description: 'Código inválido ou expirado' })
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-code')
  @ApiOperation({ summary: 'Reenvia o código de confirmação por e-mail' })
  @ApiResponse({ status: 200, description: 'Novo código enviado (se houver cadastro pendente)' })
  resendCode(@Body() body: ResendCodeDto) {
    return this.authService.resendCode(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'user1' },
        password: { type: 'string', example: 'pass123' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        companyPublicId: { type: 'string', example: 'company-uuid' },
        newPassword: { type: 'string', minLength: 6, example: 'newpass123' },
      },
      required: ['companyPublicId', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  async changePassword(
    @Body() body: { companyPublicId: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      body.companyPublicId,
      body.newPassword,
    );
  }
}
