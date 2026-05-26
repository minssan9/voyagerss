import { Controller, Get, Put, Delete, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { NotificationService } from '../services/NotificationService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('workschd/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationNestController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getNotifications(@CurrentUser() user: AuthUser, @Query() query: any) {
    const { page = '0', size = '10', type, status } = query;
    return this.notificationService.getNotifications({
      accountId: user.accountId,
      page: parseInt(page),
      size: parseInt(size),
      type,
      status,
    });
  }

  @Get('unread/count')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationService.getUnreadCount(user.accountId).then((count) => ({ count }));
  }

  @Put(':id/read')
  @HttpCode(200)
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationService.markAsRead(parseInt(id), user.accountId).then((success) => ({ success }));
  }

  @Put('mark-all-read')
  @HttpCode(200)
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationService.markAllAsRead(user.accountId).then(() => ({ success: true }));
  }

  @Delete(':id')
  deleteNotification(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationService.deleteNotification(parseInt(id), user.accountId).then((success) => ({ success }));
  }
}
