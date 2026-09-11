import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { PlatformPortalGuard } from 'src/common/guards/platform-portal.guard';
import { UpdatePortalProfileDto } from './dto/update-portal-profile.dto';
import { PeopleService } from './people.service';

type AuthedRequest = { user: JwtAuthUser };

/** Perfil do admin e do representante no portal. */
@Controller('profile')
@ApiTags('profile')
@UseGuards(AuthGuard('jwt'), PlatformPortalGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil da pessoa logada no portal' })
  getMe(@Req() req: AuthedRequest) {
    return this.peopleService.getPortalProfile(req.user.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar dados do perfil no portal' })
  update(@Req() req: AuthedRequest, @Body() dto: UpdatePortalProfileDto) {
    return this.peopleService.updatePortalProfile(req.user.userId, dto);
  }
}
