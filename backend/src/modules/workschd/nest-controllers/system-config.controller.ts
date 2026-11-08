import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { SystemConfigService } from '../services/SystemConfigService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('workschd/admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SystemConfigNestController {
  constructor(private readonly svc: SystemConfigService) {}

  @Get('categories')
  async getCategories() {
    const categories = await this.svc.getCategories();
    return { data: categories };
  }

  @Get()
  async listConfigs(@Query('category') category?: string) {
    const items = await this.svc.listConfigs(category);
    return { data: items, total: items.length };
  }

  @Post('reload')
  @HttpCode(200)
  async reloadConfigs() {
    await this.svc.reloadAll();
    return { message: 'Config cache reloaded from DB' };
  }

  @Get('catalog')
  getCatalog(@Query('categories') categories?: string) {
    const list =
      categories && categories.trim().length > 0
        ? categories.split(',').map((c) => c.trim())
        : undefined;
    return { data: this.svc.getCatalog(list) };
  }

  @Post('ensure-catalog')
  @HttpCode(200)
  async ensureCatalog(
    @Body() body: { categories?: string[] },
    @CurrentUser() user: AuthUser,
  ) {
    const categories = body?.categories?.length ? body.categories : ['finance', 'primary_data'];
    const created = await this.svc.ensureCatalogKeys(categories, user.email);
    return { message: 'Catalog keys ensured', created };
  }

  @Get(':key')
  getConfig(@Param('key') key: string) {
    return this.svc.getConfig(key);
  }

  @Put(':key')
  @HttpCode(200)
  async upsertConfig(
    @Param('key') key: string,
    @Body() body: any,
    @CurrentUser() user: AuthUser,
  ) {
    const { value, isEncrypted, description, category } = body;
    await this.svc.upsertConfig(key, String(value), { isEncrypted, description, category }, user.email);
    return { message: `Config "${key}" saved successfully` };
  }

  @Delete(':key')
  async deleteConfig(@Param('key') key: string) {
    await this.svc.deleteConfig(key);
    return { message: `Config "${key}" deleted successfully` };
  }
}
