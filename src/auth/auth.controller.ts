import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import {
  ResendCodeDto,
  SignupDto,
  VerifyEmailDto,
  ChangePasswordDto,
  SignInDto,
} from './dto/signup.dto';

type AuthedRequest = {
  user: { userId: string; companyPublicId?: string | null };
};

@Controller('auth')
@ApiTags('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  @ApiOperation({
    summary: 'Cadastro do dono (cria conta inativa e envia código por e-mail)',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Novo código enviado (se houver cadastro pendente)',
  })
  resendCode(@Body() body: ResendCodeDto) {
    return this.authService.resendCode(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({
    summary:
      'Altera a senha do usuário autenticado (senha atual obrigatória, exceto se ainda for a senha padrão)',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Req() req: AuthedRequest,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.newPassword,
      body.currentPassword,
    );
  }
}
