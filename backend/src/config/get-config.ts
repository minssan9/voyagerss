import { configService } from './config-service';

export function getConfig(key: string, defaultValue?: string): string | undefined {
  return configService.get(key, defaultValue);
}
