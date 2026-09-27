export interface ApiEnvelope<T = unknown> {
  result: 'SUCCESS' | 'ERROR';
  message: string;
  data: T | null;
}

export function apiSuccess<T>(message: string, data: T): ApiEnvelope<T> {
  return { result: 'SUCCESS', message, data };
}

export function apiError(message: string): ApiEnvelope<null> {
  return { result: 'ERROR', message, data: null };
}
