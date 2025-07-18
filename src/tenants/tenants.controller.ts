import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('my-tenants')
  @UseGuards(AuthGuard)
  async getMyTenants(@CurrentUser() user: any) {
    return this.tenantsService.getUserTenants(user.id);
  }

  @Get(':slug/info')
  async getTenantInfo(@Param('slug') slug: string) {
    return this.tenantsService.getTenantPublicInfo(slug);
  }
}
