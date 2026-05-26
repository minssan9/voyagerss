import { Injectable } from '@nestjs/common';
// @ts-ignore
import ApplicationFactory from './ApplicationFactory';
// @ts-ignore
import AviationAbbreviationService from './features/aviation-abbreviation/architecture/services/AviationAbbreviationService';

@Injectable()
export class AviationService {
  private topicService: any;
  private weatherService: any;
  private schedulingService: any;
  readonly abbreviationService = new AviationAbbreviationService();
  private initialized = false;

  async ensureInit(): Promise<void> {
    if (this.initialized) return;
    const factory = new ApplicationFactory();
    factory.createApp(null);
    const db = factory.getService('database');
    await db.initialize();
    this.topicService = factory.getContainer().resolve('topicService');
    this.weatherService = factory.getContainer().resolve('weatherService');
    await this.weatherService.initialize();
    this.schedulingService = factory.getContainer().resolve('schedulingService');
    this.initialized = true;
  }

  async getAllTopics() {
    await this.ensureInit();
    return this.topicService.getAllTopics();
  }

  async updateTopic(id: number, data: any) {
    await this.ensureInit();
    return this.topicService.updateTopic(id, data);
  }

  async createTopic(data: any) {
    await this.ensureInit();
    return this.topicService.createTopic(data);
  }

  async manualAbbreviationNotification() {
    await this.ensureInit();
    if (!this.schedulingService) throw new Error('Scheduling service not available');
    return this.schedulingService.manualAbbreviationNotification();
  }
}
