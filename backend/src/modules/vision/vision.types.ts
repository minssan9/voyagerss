import { tApi } from '../common/i18n-locale';

export interface ApiEnvelope<T> {
  result: 'SUCCESS' | 'ERROR';
  message: string;
  data: T | null;
}

export interface VisionEndpoints {
  camBaseUrl: string;
  judgeBaseUrl: string;
}

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export type JudgeMode = 'bool' | 'choice';

export interface CamJudgeInput {
  mode?: string;
  question?: string;
  choices?: string;
  save?: boolean | string;
}

/** Form value for vision_judge `save`; anything but an explicit false keeps the record. */
export function saveFlag(value: unknown): 'true' | 'false' {
  return value === false || value === 'false' || value === '0' ? 'false' : 'true';
}

export const DEFAULT_CAM_BASE_URL = 'http://127.0.0.1:8080';
export const DEFAULT_JUDGE_BASE_URL = 'http://127.0.0.1:8000';

export function success<T>(data: T, message = 'ok'): ApiEnvelope<T> {
  return { result: 'SUCCESS', message, data };
}

export function failure(message: string): ApiEnvelope<null> {
  return { result: 'ERROR', message, data: null };
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error(tApi('vision.urlEmpty'));
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(tApi('vision.urlInvalid'));
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(tApi('vision.urlProtocol'));
  }
  return trimmed;
}

export function messageFromUpstream(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return `업스트림 응답 오류 (${status})`;
}

export function isSafeImageFilename(filename: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(filename) && !filename.includes('..');
}

const JPEG_SOI = Buffer.from([0xff, 0xd8]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);

/**
 * Returns the first complete JPEG (SOI..EOI) inside an MJPEG byte buffer,
 * or null while the frame is still incomplete.
 */
export function extractJpegFrame(buffer: Buffer): Buffer | null {
  const start = buffer.indexOf(JPEG_SOI);
  if (start < 0) {
    return null;
  }
  const end = buffer.indexOf(JPEG_EOI, start + JPEG_SOI.length);
  if (end < 0) {
    return null;
  }
  return buffer.subarray(start, end + JPEG_EOI.length);
}
