import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from '../services/StatisticsService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('workschd/statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsNestController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'TEAM_LEADER')
  getDashboard() {
    return this.statisticsService.getDashboardStatistics();
  }

  @Get('team/:teamId')
  @Roles('ADMIN', 'TEAM_LEADER')
  getTeamStats(@Param('teamId') teamId: string) {
    return this.statisticsService.getTeamStatistics(parseInt(teamId));
  }

  @Get('worker/:workerId')
  @Roles('ADMIN', 'TEAM_LEADER', 'HELPER')
  getWorkerStats(@Param('workerId') workerId: string) {
    return this.statisticsService.getWorkerStatistics(parseInt(workerId));
  }

  @Get('tasks/date-range')
  @Roles('ADMIN', 'TEAM_LEADER')
  getTaskStatsByDateRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.statisticsService.getTaskStatisticsByDateRange(new Date(startDate), new Date(endDate));
  }
}
