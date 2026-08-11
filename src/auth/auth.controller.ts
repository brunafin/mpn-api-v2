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
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleAuthDto,
  CompleteProfileDto,
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
  @Post('forgot-password')
  @ApiOperation({
    summary:
      'Solicita código por e-mail para redefinir a senha (resposta genérica)',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mensagem genérica (código enviado se a conta existir e estiver ativa)',
  })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Redefine a senha com o código recebido por e-mail',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Senha redefinida' })
  @ApiResponse({ status: 400, description: 'Código inválido/expirado ou senha fraca' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
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
  @Post('google')
  @ApiOperation({
    summary:
      'Login/cadastro com Google (id_token). Conta existente com senha exige password para vincular.',
  })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({ status: 200, description: 'JWT emitido' })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou GOOGLE_LINK_REQUIRED',
  })
  googleAuth(@Body() body: GoogleAuthDto) {
    return this.authService.googleAuth(body);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('complete-profile')
  @ApiOperation({
    summary:
      'Após login Google: aceita termos e opcionalmente informa telefone de contato',
  })
  @ApiBody({ type: CompleteProfileDto })
  @ApiResponse({ status: 200, description: 'Perfil completo + JWT atualizado' })
  async completeProfile(
    @Req() req: AuthedRequest,
    @Body() body: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(req.user.userId, body);
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
  @ApiResponse({
    status: 200,
    description:
      'Senha alterada; retorna access_token com updatedPassword=true',
  })
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
