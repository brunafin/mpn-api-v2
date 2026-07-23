import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { OnboardingService } from './onboarding.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';

interface AuthedRequest extends Request {
  user: { userId: string; email?: string };
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('onboarding')
@ApiTags('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @ApiOperation({
    summary:
      'Conclui o onboarding do dono logado: cria estabelecimento, quadras e a grade (preço por quadra)',
  })
  @ApiResponse({ status: 201, description: 'Estabelecimento criado' })
  @ApiResponse({ status: 409, description: 'Dono já possui estabelecimento' })
  complete(@Req() req: AuthedRequest, @Body() body: CreateOnboardingDto) {
    return this.onboardingService.complete(req.user.userId, body);
  }
}
