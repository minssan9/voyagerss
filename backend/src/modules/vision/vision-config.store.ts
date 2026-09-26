import { Injectable } from '@nestjs/common';
import {
  DEFAULT_CAM_BASE_URL,
  DEFAULT_JUDGE_BASE_URL,
  normalizeBaseUrl,
  VisionEndpoints,
} from './vision.types';

function readBaseUrl(envValue: string | undefined, fallback: string): string {
  if (!envValue || !envValue.trim()) {
    return fallback;
  }
  try {
    return normalizeBaseUrl(envValue);
  } catch {
    return fallback;
  }
}

@Injectable()
export class VisionConfigStore {
  private camBaseUrl = readBaseUrl(process.env.VISION_CAM_BASE_URL, DEFAULT_CAM_BASE_URL);
  private judgeBaseUrl = readBaseUrl(process.env.VISION_JUDGE_BASE_URL, DEFAULT_JUDGE_BASE_URL);

  get(): VisionEndpoints {
    return {
      camBaseUrl: this.camBaseUrl,
      judgeBaseUrl: this.judgeBaseUrl,
    };
  }

  update(input: Partial<VisionEndpoints>): VisionEndpoints {
    if (input.camBaseUrl !== undefined) {
      this.camBaseUrl = normalizeBaseUrl(input.camBaseUrl);
    }
    if (input.judgeBaseUrl !== undefined) {
      this.judgeBaseUrl = normalizeBaseUrl(input.judgeBaseUrl);
    }
    return this.get();
  }
}
