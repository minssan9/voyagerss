import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { AccountService } from '../services/AccountService';
import { AccountScheduleService } from '../services/AccountScheduleService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('workschd')
export class AccountNestController {
  constructor(
    private readonly accountService: AccountService,
    private readonly scheduleService: AccountScheduleService,
  ) {}

  @Post('auth/signup')
  @HttpCode(200)
  async signup(@Body() body: any) {
    return this.accountService.registerForWorkschd(body);
  }

  @Post('accounts')
  async createAccount(@Body() body: any) {
    return this.accountService.registerForWorkschd(body);
  }

  @Get('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async getAccount(@Param('id') id: string) {
    return this.accountService.getAccountById(parseInt(id));
  }

  @Put('accounts/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.accountService.updateProfile(user.accountId, body);
  }

  @Post('accounts/change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.accountService.changePassword(user.accountId, body.currentPassword, body.newPassword);
  }

  @Get('account/:id/task-requests')
  @UseGuards(JwtAuthGuard)
  async getTaskRequests(@Param('id') id: string) {
    return this.scheduleService.getTaskRequests(parseInt(id), {});
  }

  @Get('account/:id/schedule-preferences')
  @UseGuards(JwtAuthGuard)
  async getSchedulePreferences(@Param('id') id: string) {
    return this.scheduleService.getSchedulePreferences(parseInt(id));
  }

  @Post('account/:id/schedule-preferences')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async saveSchedulePreferences(@Param('id') id: string, @Body() body: any) {
    return this.scheduleService.saveSchedulePreferences(parseInt(id), body);
  }

  @Get('account/:id/unavailable-dates')
  @UseGuards(JwtAuthGuard)
  async getUnavailableDates(@Param('id') id: string) {
    return this.scheduleService.getUnavailableDates(parseInt(id));
  }

  @Post('account/:id/unavailable-dates')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async saveUnavailableDates(@Param('id') id: string, @Body() body: any) {
    return this.scheduleService.saveUnavailableDates(parseInt(id), body);
  }
}
