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
    throw new Error('주소가 비어 있습니다.');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('올바른 http(s) 주소가 아닙니다.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('http 또는 https 주소만 사용할 수 있습니다.');
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
