import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CompanyImagesService } from './company-images.service';
import { CreateCompanyImageDto } from './dto/create-company-image.dto';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

type AuthedRequest = {
  user: { userId: string };
};

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('company-images')
@ApiTags('company-images')
export class CompanyImagesController {
  constructor(private readonly companyImagesService: CompanyImagesService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar imagem para empresa (legado; preferir /companies/:id/photos)',
  })
  @ApiBody({
    description: 'Dados para criar uma nova imagem para empresa',
    type: CreateCompanyImageDto,
    examples: {
      exemplo1: {
        summary: 'Imagem com todos os dados preenchidos',
        value: {
          url: 'https://example.com/image.jpg',
          company_id: 1,
        },
      },
    },
  })
  create(
    @Body() createCompanyImageDto: CreateCompanyImageDto,
    @Req() req: AuthedRequest,
  ) {
    return this.companyImagesService.create(
      createCompanyImageDto,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar imagens da empresa (só do dono)' })
  @ApiQuery({ name: 'companyId', type: Number, required: true })
  findAll(
    @Query('companyId') companyId: number,
    @Req() req: AuthedRequest,
  ) {
    return this.companyImagesService.findAll(+companyId, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover imagem (só do dono)' })
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.companyImagesService.remove(+id, req.user.userId);
  }
}
