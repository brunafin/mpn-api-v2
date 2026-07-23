import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

/**
 * HTTP de Person desativado: cadastro só via /auth/signup.
 * PeopleService permanece para auth/onboarding interno.
 */
@Controller('people')
@ApiTags('people')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PeopleController {}
