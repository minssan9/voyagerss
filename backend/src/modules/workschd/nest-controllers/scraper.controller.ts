import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  runAllScrapers,
  getScraperStatus,
  syncScraperFuneralHomes,
} from '../scraper/index';
import { queryFunerals, linkFuneralToTask, queryFuneralHomes } from '../scraper/db';

@Controller('workschd')
@UseGuards(JwtAuthGuard)
export class ScraperNestController {
  @Post('scrape')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  async triggerScrape() {
    const report = await runAllScrapers();
    return { success: true, report };
  }

  @Get('scraped-funerals')
  getScrapedFunerals(@Query() query: any) {
    const { region, funeralHomeName, page = '0', size = '20' } = query;
    return queryFunerals({ region, funeralHomeName, page: parseInt(page), size: parseInt(size) });
  }

  @Get('funeral-homes')
  getFuneralHomes(@Query() query: any) {
    const { region, isActive, page = '0', size = '50' } = query;
    return queryFuneralHomes({
      region,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      page: parseInt(page),
      size: parseInt(size),
    });
  }

  @Get('scraper/status')
  getStatus() {
    return getScraperStatus();
  }

  @Post('scraper/funeral-homes/sync')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  syncFuneralHomes() {
    return syncScraperFuneralHomes();
  }

  @Post('scraped-funerals/:funeralId/link-task')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'TEAM_LEADER')
  @HttpCode(200)
  linkToTask(@Param('funeralId') funeralId: string, @Body() body: { taskId: number }) {
    return linkFuneralToTask(parseInt(funeralId), body.taskId);
  }
}
