import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TaskService } from '../services/TaskService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { TaskOwnerGuard } from '../guards/task-owner.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('workschd')
@UseGuards(JwtAuthGuard)
export class TaskNestController {
  constructor(private readonly taskService: TaskService) {}

  @Post('task')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(HttpStatus.CREATED)
  createTask(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.taskService.createTask(body, user.accountId);
  }

  @Post('task/tasks')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(HttpStatus.CREATED)
  createMultipleTasks(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.taskService.createTasks(body, user.accountId);
  }

  @Get('task')
  getAllTasks(@Query() query: any) {
    const { page = '0', size = '10', region, status, startDate, endDate } = query;
    return this.taskService.getAllTasks({
      page: parseInt(page),
      size: parseInt(size),
      region,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('task/:id')
  getTaskById(@Param('id') id: string) {
    return this.taskService.getTaskById(parseInt(id));
  }

  @Put('task/:id')
  @UseGuards(RolesGuard, TaskOwnerGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  updateTask(@Param('id') id: string, @Body() body: any) {
    return this.taskService.updateTask(parseInt(id), body);
  }

  @Delete('task/:id')
  @UseGuards(RolesGuard, TaskOwnerGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(parseInt(id));
  }

  @Get('task/:id/employees')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  getTaskEmployees(@Param('id') id: string) {
    return this.taskService.getTaskEmployees(parseInt(id));
  }

  @Post('task/:taskId/request')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER', 'HELPER')
  @HttpCode(HttpStatus.CREATED)
  createJoinRequest(@Param('taskId') taskId: string, @CurrentUser() user: AuthUser) {
    return this.taskService.createJoinRequest(parseInt(taskId), user.accountId);
  }

  @Post('task/request/:requestId/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(HttpStatus.OK)
  approveJoinRequest(@Param('requestId') requestId: string) {
    return this.taskService.approveJoinRequest(parseInt(requestId));
  }

  @Post('task/request/:requestId/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(HttpStatus.OK)
  rejectJoinRequest(@Param('requestId') requestId: string) {
    return this.taskService.rejectJoinRequest(parseInt(requestId));
  }

  @Delete('task/request/:requestId')
  cancelJoinRequest(@Param('requestId') requestId: string, @CurrentUser() user: AuthUser) {
    return this.taskService.cancelJoinRequest(parseInt(requestId), user.accountId);
  }

  @Post('task-employee/:taskEmployeeId/check-in')
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('taskEmployeeId') taskEmployeeId: string, @CurrentUser() user: AuthUser) {
    return this.taskService.checkIn(parseInt(taskEmployeeId), user.accountId);
  }

  @Post('task-employee/:taskEmployeeId/check-out')
  @HttpCode(HttpStatus.OK)
  checkOut(@Param('taskEmployeeId') taskEmployeeId: string, @CurrentUser() user: AuthUser) {
    return this.taskService.checkOut(parseInt(taskEmployeeId), user.accountId);
  }
}
