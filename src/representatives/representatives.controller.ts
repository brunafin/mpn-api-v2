import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthUser } from 'src/auth/jwt.strategy';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { RepresentativeGuard } from 'src/common/guards/representative.guard';
import { CreateRepresentativePayoutDto } from './dto/create-representative-payout.dto';
import { CreateRepresentativeDto } from './dto/create-representative.dto';
import { UpdateRepresentativeDto } from './dto/update-representative.dto';
import { RepresentativesService } from './representatives.service';

type AuthedRequest = { user: JwtAuthUser };

@Controller('representatives')
@ApiTags('representatives')
@ApiBearerAuth()
export class RepresentativesController {
  constructor(
    private readonly representativesService: RepresentativesService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RepresentativeGuard)
  @ApiOperation({ summary: 'Painel do representante logado' })
  getMe(@Req() req: AuthedRequest) {
    return this.representativesService.getByPublicId(req.user.userId);
  }

  @Get('me/companies/:companyPublicId')
  @UseGuards(AuthGuard('jwt'), RepresentativeGuard)
  @ApiOperation({ summary: 'Detalhe de uma arena do representante logado' })
  getMyCompany(
    @Req() req: AuthedRequest,
    @Param('companyPublicId') companyPublicId: string,
  ) {
    return this.representativesService.getMyCompany(
      req.user.userId,
      companyPublicId,
    );
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Cadastrar representante' })
  create(@Body() dto: CreateRepresentativeDto) {
    return this.representativesService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Listar representantes' })
  list() {
    return this.representativesService.list();
  }

  @Post(':publicId/payouts')
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Informar pagamento da comissão do mês' })
  recordPayout(
    @Param('publicId') publicId: string,
    @Body() dto: CreateRepresentativePayoutDto,
  ) {
    return this.representativesService.recordPayout(publicId, dto);
  }

  @Get(':publicId')
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Detalhe de um representante' })
  getOne(@Param('publicId') publicId: string) {
    return this.representativesService.getByPublicId(publicId);
  }

  @Patch(':publicId')
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Atualizar representante e comissões' })
  update(
    @Param('publicId') publicId: string,
    @Body() dto: UpdateRepresentativeDto,
  ) {
    return this.representativesService.update(publicId, dto);
  }

  @Delete(':publicId')
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  @ApiOperation({ summary: 'Desativar representante e desvincular arenas' })
  remove(@Param('publicId') publicId: string) {
    return this.representativesService.remove(publicId);
  }
}
