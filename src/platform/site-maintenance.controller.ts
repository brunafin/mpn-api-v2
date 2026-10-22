import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PlatformMaintenanceService } from './platform-maintenance.service';

@Controller('site')
@ApiTags('site')
export class SiteMaintenanceController {
  constructor(private readonly maintenance: PlatformMaintenanceService) {}

  @Get('maintenance')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Estado de manutenção do site público (sem autenticação)',
  })
  getMaintenance() {
    return this.maintenance.get();
  }
}
