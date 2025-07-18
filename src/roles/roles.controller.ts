import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantAccessGuard } from '../common/guards/tenant-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { RolesPermissionsService } from '../common/services/roles-permissions.service';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './dto/roles.dto';

@Controller('roles')
@UseGuards(TenantGuard, AuthGuard, TenantAccessGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private rolesService: RolesService,
    private rolesPermissionsService: RolesPermissionsService,
  ) {}

  @Get()
  @RequirePermissions('roles.read')
  async getRoles(@CurrentTenant() tenant: any) {
    return this.rolesService.getRolesByTenant(tenant.id);
  }

  @Get('permissions')
  @RequirePermissions('roles.read')
  async getPermissions(@CurrentTenant() tenant: any) {
    return this.rolesPermissionsService.getPermissionsByTenant(tenant.id);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  async getRole(@Param('id') id: string, @CurrentTenant() tenant: any) {
    return this.rolesService.getRoleWithPermissions(id, tenant.id);
  }

  @Post()
  @RequirePermissions('roles.create')
  async createRole(
    @CurrentTenant() tenant: any,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.rolesService.createRole(
      tenant.id,
      createRoleDto.name,
      createRoleDto.displayName,
      createRoleDto.description,
      createRoleDto.permissionIds,
    );
  }

  @Put(':id')
  @RequirePermissions('roles.update')
  async updateRole(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(
      id,
      tenant.id,
      updateRoleDto.displayName,
      updateRoleDto.description,
      updateRoleDto.permissionIds,
    );
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  async deleteRole(@Param('id') id: string, @CurrentTenant() tenant: any) {
    return this.rolesService.deleteRole(id, tenant.id);
  }

  @Post(':id/assign-user')
  @RequirePermissions('users.update')
  async assignRoleToUser(
    @Param('id') roleId: string,
    @CurrentTenant() tenant: any,
    @Body() assignDto: AssignRoleDto,
  ) {
    return this.rolesService.assignRoleToUser(
      assignDto.userId,
      tenant.id,
      roleId,
    );
  }

  @Get(':id/users')
  @RequirePermissions('roles.read', 'users.read')
  async getUsersByRole(
    @Param('id') roleId: string,
    @CurrentTenant() tenant: any,
  ) {
    return this.rolesService.getUsersByRole(tenant.id, roleId);
  }

  @Post('initialize')
  @RequirePermissions('settings.update')
  async initializeRoles(@CurrentTenant() tenant: any) {
    return this.rolesService.initializeTenantRoles(tenant.id);
  }
}
