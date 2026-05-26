import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ShopService } from '../services/ShopService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('workschd/team/:teamId/shop')
@UseGuards(JwtAuthGuard)
export class ShopNestController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  createShop(@Param('teamId') teamId: string, @Body() body: any) {
    return this.shopService.createShop({ ...body, teamId: parseInt(teamId) });
  }

  @Get()
  getAllShops(@Param('teamId') teamId: string, @Query('district') district?: string) {
    if (district) return this.shopService.findByTeamIdAndDistrict(parseInt(teamId), district);
    return this.shopService.findByTeamId(parseInt(teamId));
  }

  @Get('active')
  getActiveShops(@Param('teamId') teamId: string) {
    return this.shopService.findActiveStoresByTeamId(parseInt(teamId));
  }

  @Get(':id')
  getShopById(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.shopService.getShopById(parseInt(id));
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  updateShop(@Param('id') id: string, @Body() body: any) {
    return this.shopService.updateShop(parseInt(id), body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  deleteShop(@Param('id') id: string) {
    return this.shopService.deleteShop(parseInt(id));
  }
}
