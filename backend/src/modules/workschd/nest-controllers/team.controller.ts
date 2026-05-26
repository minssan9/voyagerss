import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { TeamService } from '../services/TeamService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('workschd')
@UseGuards(JwtAuthGuard)
export class TeamNestController {
  constructor(private readonly teamService: TeamService) {}

  @Get('team')
  getTeams(@Query() query: any) {
    const { page = '0', size = '10', name, region, scheduleType } = query;
    return this.teamService.getTeams({ page: parseInt(page), size: parseInt(size), name, region, scheduleType });
  }

  @Post('team')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  createTeam(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.teamService.createTeam(body, user.accountId);
  }

  @Post('team/generate-invite')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  async generateInviteLink(@Body() body: any) {
    const { teamName, region } = body;
    const result = await this.teamService.getTeams({ name: teamName, region });
    if (!result.content.length) return { message: 'Team not found' };
    return this.teamService.generateInviteLink(result.content[0].id);
  }

  @Get('team/join/:hash')
  joinByInvite(@Param('hash') hash: string, @CurrentUser() user: AuthUser) {
    return this.teamService.joinByInviteHash(hash, user.accountId);
  }

  @Get('team/:teamId/members')
  getTeamMembers(@Param('teamId') teamId: string, @Query() query: any) {
    const { page = '0', size = '10', name, email, status } = query;
    return this.teamService.getTeamMembers(parseInt(teamId), {
      page: parseInt(page), size: parseInt(size), name, email, status,
    });
  }

  @Post('team/:teamId/approve/:requestId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  approveJoinRequest(@Param('teamId') teamId: string, @Param('requestId') requestId: string) {
    return this.teamService.approveJoinRequest(parseInt(teamId), parseInt(requestId));
  }

  @Get('team/:teamId/schedule-config')
  getScheduleConfig(@Param('teamId') teamId: string) {
    return this.teamService.getScheduleConfig(parseInt(teamId));
  }

  @Post('team/:teamId/schedule-config')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  saveScheduleConfig(@Param('teamId') teamId: string, @Body() body: any) {
    return this.teamService.saveScheduleConfig(parseInt(teamId), body);
  }

  @Get('teams/:id')
  getTeam(@Param('id') id: string) {
    return this.teamService.getTeamById(parseInt(id));
  }
}
