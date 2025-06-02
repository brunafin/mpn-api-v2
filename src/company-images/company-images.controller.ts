import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyImagesService } from './company-images.service';
import { CreateCompanyImageDto } from './dto/create-company-image.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('company-images')
@ApiTags('company-images')
export class CompanyImagesController {
  constructor(private readonly companyImagesService: CompanyImagesService) { }

  @Post()
  @ApiOperation({ summary: 'Criar imagem para empresa' })
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
  create(@Body() createCompanyImageDto: CreateCompanyImageDto) {
    return this.companyImagesService.create(createCompanyImageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as imagens de uma quadra' })
  @ApiQuery({ name: 'companyId', type: Number, required: true })
  findAll(@Query('companyId') companyId: number) {
    return this.companyImagesService.findAll(companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma imagem da quadra' })
  remove(@Param('id') id: string) {
    return this.companyImagesService.remove(+id);
  }
}
