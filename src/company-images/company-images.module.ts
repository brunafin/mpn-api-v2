import { Module } from '@nestjs/common';
import { CompanyImagesService } from './company-images.service';
import { CompanyImagesController } from './company-images.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyImage } from './entities/company-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyImage])],
  controllers: [CompanyImagesController],
  providers: [CompanyImagesService],
})
export class CompanyImagesModule {}
