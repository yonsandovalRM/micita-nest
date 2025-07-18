import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import {
  CurrentUser,
  CurrentTenant,
} from '../common/decorators/tenant.decorator';

@Controller('users')
@UseGuards(TenantGuard, AuthGuard, TenantAccessGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() user: any, @CurrentTenant() tenant: any) {
    return this.usersService.getUserInTenant(user.id, tenant.id);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string, @CurrentTenant() tenant: any) {
    return this.usersService.getUserInTenant(id, tenant.id);
  }
}
