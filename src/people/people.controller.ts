import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { UpdateColorModeDto } from './dto/update-color-mode.dto';
import { PeopleService } from './people.service';

type AuthedRequest = { user: JwtAuthUser };

/**
 * Cadastro de pessoa continua só em /auth/signup.
 * Aqui ficam preferências da pessoa já autenticada.
 */
@Controller('people')
@ApiTags('people')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Preferências da pessoa logada' })
  getPreferences(@Req() req: AuthedRequest) {
    return this.peopleService.getColorModePreference(req.user.userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Gravar a aparência escolhida pela pessoa' })
  updatePreferences(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateColorModeDto,
  ) {
    return this.peopleService.updateColorModePreference(
      req.user.userId,
      dto.colorMode,
    );
  }
}
