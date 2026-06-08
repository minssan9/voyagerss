import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../workschd/guards/jwt-auth.guard';
import { RolesGuard } from '../../workschd/guards/roles.guard';
import { Roles } from '../../workschd/decorators/roles.decorator';
import { RbacService, CreateRoleDto, UpdateRoleDto, CreatePermissionDto, UpdatePermissionDto } from '../rbac.service';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RbacAdminController {
  constructor(private readonly rbacService: RbacService) {}

  // ── Roles ──────────────────────────────────────────────────────────────

  @Get('roles')
  async listRoles() {
    return { data: await this.rbacService.listRoles() };
  }

  @Get('roles/:id')
  async getRole(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.rbacService.getRole(id) };
  }

  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return { data: await this.rbacService.createRole(dto) };
  }

  @Put('roles/:id')
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return { data: await this.rbacService.updateRole(id, dto) };
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    await this.rbacService.deleteRole(id);
  }

  // ── Permissions ────────────────────────────────────────────────────────

  @Get('permissions')
  async listPermissions(@Query('module') module?: string, @Query('type') type?: string) {
    return { data: await this.rbacService.listPermissions(module, type) };
  }

  @Get('permissions/:id')
  async getPermission(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.rbacService.getPermission(id) };
  }

  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return { data: await this.rbacService.createPermission(dto) };
  }

  @Put('permissions/:id')
  async updatePermission(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionDto) {
    return { data: await this.rbacService.updatePermission(id, dto) };
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    await this.rbacService.deletePermission(id);
  }

  // ── Role-Permission assignments ────────────────────────────────────────

  @Get('roles/:roleId/permissions')
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return { data: await this.rbacService.getRolePermissions(roleId) };
  }

  @Post('roles/:roleId/permissions/:permissionId')
  async assignPermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return { data: await this.rbacService.assignPermissionToRole(roleId, permissionId) };
  }

  @Put('roles/:roleId/permissions')
  async setRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() body: { permissionIds: number[] },
  ) {
    await this.rbacService.setRolePermissions(roleId, body.permissionIds);
    return { message: 'Permissions updated' };
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.rbacService.removePermissionFromRole(roleId, permissionId);
  }

  // ── Subject-Role assignments ───────────────────────────────────────────

  @Get('subjects')
  async listSubjectRoles(@Query('module') module?: string, @Query('subjectId') subjectId?: string) {
    return { data: await this.rbacService.listSubjectRoles(module, subjectId) };
  }

  @Get('subjects/:module/:subjectId/roles')
  async getSubjectRoles(
    @Param('module') module: string,
    @Param('subjectId') subjectId: string,
  ) {
    return { data: await this.rbacService.getSubjectRoles(module, subjectId) };
  }

  @Post('subjects/:module/:subjectId/roles/:roleId')
  async assignRole(
    @Param('module') module: string,
    @Param('subjectId') subjectId: string,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return { data: await this.rbacService.assignRoleToSubject(module, subjectId, roleId) };
  }

  @Put('subjects/:module/:subjectId/roles')
  async setSubjectRoles(
    @Param('module') module: string,
    @Param('subjectId') subjectId: string,
    @Body() body: { roleIds: number[] },
  ) {
    await this.rbacService.setSubjectRoles(module, subjectId, body.roleIds);
    return { message: 'Roles updated' };
  }

  @Delete('subjects/:module/:subjectId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('module') module: string,
    @Param('subjectId') subjectId: string,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    await this.rbacService.removeRoleFromSubject(module, subjectId, roleId);
  }

  // ── Subject permission query ───────────────────────────────────────────

  @Get('subjects/:module/:subjectId/permissions')
  async getSubjectPermissions(
    @Param('module') module: string,
    @Param('subjectId') subjectId: string,
  ) {
    return { data: await this.rbacService.getSubjectPermissions(module, subjectId) };
  }
}
