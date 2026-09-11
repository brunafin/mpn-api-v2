import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { CostsService } from './costs.service';
import { CreatePlatformCostDto } from './dto/create-platform-cost.dto';
import { UpdatePlatformCostDto } from './dto/update-platform-cost.dto';

@Controller('costs')
@ApiTags('costs')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar custo da plataforma' })
  create(@Body() dto: CreatePlatformCostDto) {
    return this.costsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar custos da plataforma' })
  findAll() {
    return this.costsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar custo' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformCostDto,
  ) {
    return this.costsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir custo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.costsService.remove(id);
  }
}
