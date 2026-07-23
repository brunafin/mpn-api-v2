import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from 'src/common/guards/platform-admin.guard';
import { PaymentCompanyService } from './payment_company.service';
import { CreatePaymentCompanyDto } from './dto/create-payment_company.dto';
import { UpdatePaymentCompanyDto } from './dto/update-payment_company.dto';

@Controller('payment-company')
@ApiTags('payment-company')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
@ApiBearerAuth()
export class PaymentCompanyController {
  constructor(private readonly paymentCompanyService: PaymentCompanyService) {}

  @Post()
  create(@Body() createPaymentCompanyDto: CreatePaymentCompanyDto) {
    return this.paymentCompanyService.create(createPaymentCompanyDto);
  }

  @Get()
  findAll() {
    return this.paymentCompanyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentCompanyService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaymentCompanyDto: UpdatePaymentCompanyDto,
  ) {
    return this.paymentCompanyService.update(+id, updatePaymentCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentCompanyService.remove(+id);
  }
}
