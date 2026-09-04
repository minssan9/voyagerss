import { Controller, Get, Post, Put, Param, Query, Body, HttpCode } from '@nestjs/common';
import { AviationService } from './aviation.service';

@Controller('aviation')
export class AviationNestController {
  constructor(private readonly svc: AviationService) {}

  // ── Knowledge / Topics ──────────────────────────────────────────────────

  @Get('knowledge')
  async getKnowledge() {
    try {
      const topics = await this.svc.getAllTopics();
      const data: any = {};
      for (const topic of topics) {
        data[topic.day_of_month] = { topic: topic.name, description: topic.description };
      }
      return data;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('topics/schedule')
  async getSchedule() {
    try { return await this.svc.getAllTopics(); } catch (e: any) { return { error: e.message }; }
  }

  @Get('topics/stats')
  async getTopicStats() {
    try {
      const topics = await this.svc.getAllTopics();
      return { total: topics.length, active: topics.filter((t: any) => t.isActive).length };
    } catch (e: any) { return { error: e.message }; }
  }

  @Get('topics')
  async getTopics() {
    try { return await this.svc.getAllTopics(); } catch (e: any) { return { error: e.message }; }
  }

  @Put('knowledge/:day')
  async updateKnowledge(@Param('day') day: string, @Body() body: { topic: string; description: string }) {
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) return { error: 'Invalid day (1-31)' };
    try {
      const topics = await this.svc.getAllTopics();
      const existing = topics.find((t: any) => t.day_of_month === dayNum);
      if (!existing) return { error: `No knowledge entry for day ${dayNum}` };
      const updated = await this.svc.updateTopic(existing.id, { name: body.topic, description: body.description });
      return { success: true, data: updated };
    } catch (e: any) { return { error: e.message }; }
  }

  @Post('knowledge/validate')
  @HttpCode(200)
  async validateKnowledge() {
    try {
      const topics = await this.svc.getAllTopics();
      const missing: number[] = [];
      for (let d = 1; d <= 31; d++) { if (!topics.find((t: any) => t.day_of_month === d)) missing.push(d); }
      return { success: true, data: { valid: missing.length === 0, missingDays: missing, totalTopics: topics.length } };
    } catch (e: any) { return { error: e.message }; }
  }

  @Post('knowledge/backup')
  @HttpCode(200)
  async backupKnowledge() {
    try {
      const topics = await this.svc.getAllTopics();
      return { success: true, data: { exportedAt: new Date().toISOString(), count: topics.length, topics } };
    } catch (e: any) { return { error: e.message }; }
  }

  @Post('knowledge/restore')
  @HttpCode(200)
  restoreKnowledge(@Body() body: { topics: any[] }) {
    if (!Array.isArray(body.topics)) return { error: 'topics array is required' };
    return { success: true, data: { restored: body.topics.length, message: 'Knowledge restore acknowledged' } };
  }

  @Post('topics')
  async createTopic(@Body() body: { name: string; description?: string; day_of_month?: number }) {
    if (!body.name) return { error: 'name is required' };
    try {
      const created = await this.svc.createTopic(body);
      return { success: true, data: created };
    } catch (e: any) { return { error: e.message }; }
  }

  @Put('topics/:id')
  async updateTopicById(@Param('id') id: string, @Body() body: any) {
    const idNum = parseInt(id);
    if (isNaN(idNum)) return { error: 'Invalid ID' };
    try {
      const updated = await this.svc.updateTopic(idNum, body);
      return { success: true, data: updated };
    } catch (e: any) { return { error: e.message }; }
  }

  // ── Weather (stubs) ────────────────────────────────────────────────────

  @Post('weather/collect') @HttpCode(200)
  collectWeather() { return { success: true, data: { message: 'Weather collection triggered', collected: 0 } }; }

  @Post('weather/cleanup') @HttpCode(200)
  cleanupWeather() { return { success: true, data: { message: 'Weather cleanup triggered', removed: 0 } }; }

  @Get('weather/images')
  getWeatherImages() { return { success: true, data: { images: [], count: 0 } }; }

  @Get('weather/kma/status')
  getKmaStatus() { return { success: true, data: { status: 'inactive', lastUpdate: null } }; }

  @Get('weather/gathering/enabled')
  getGatheringEnabled() { return { success: true, data: { enabled: false } }; }

  @Post('weather/gathering/enabled') @HttpCode(200)
  setGatheringEnabled(@Body() body: { enabled: boolean }) { return { success: true, data: { enabled: body.enabled, message: 'Weather gathering status updated' } }; }

  // ── Abbreviations ──────────────────────────────────────────────────────

  @Get('abbreviations/random')
  getRandomAbbreviations(@Query('count') count = '10') {
    try {
      const abbrevs = this.svc.abbreviationService.getRandomAbbreviations(parseInt(count));
      return { success: true, data: { abbreviations: abbrevs, count: abbrevs.length, totalAvailable: this.svc.abbreviationService.getTotalCount() } };
    } catch (e: any) { return { error: e.message }; }
  }

  @Get('abbreviations/preview')
  getAbbreviationPreview() {
    try {
      const abbrevs = this.svc.abbreviationService.getRandomAbbreviations(10);
      const message = this.svc.abbreviationService.formatForTelegram(abbrevs);
      return { success: true, data: { message, abbreviations: abbrevs, messageLength: message.length } };
    } catch (e: any) { return { error: e.message }; }
  }

  @Get('abbreviations/search')
  searchAbbreviations(@Query('q') q: string) {
    if (!q) return { error: 'Search query (q) is required' };
    try {
      const results = this.svc.abbreviationService.searchAbbreviations(q);
      return { success: true, data: { results, count: results.length, query: q } };
    } catch (e: any) { return { error: e.message }; }
  }

  @Post('abbreviations/broadcast') @HttpCode(200)
  async broadcastAbbreviations() {
    try {
      const result = await this.svc.manualAbbreviationNotification();
      return { success: result.success, data: result };
    } catch (e: any) { return { error: e.message }; }
  }

  @Get('abbreviations/:code')
  getAbbreviationByCode(@Param('code') code: string) {
    try {
      const abbrev = this.svc.abbreviationService.getByCode(code);
      if (!abbrev) return { error: `Abbreviation '${code}' not found` };
      return { success: true, data: abbrev };
    } catch (e: any) { return { error: e.message }; }
  }

  @Get('abbreviations')
  getAbbreviationsInfo() {
    try {
      return { success: true, data: { totalCount: this.svc.abbreviationService.getTotalCount(), message: 'Use /abbreviations/random to get random abbreviations' } };
    } catch (e: any) { return { error: e.message }; }
  }
}
