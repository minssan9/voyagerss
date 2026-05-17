import { Response } from 'express';

const registry = new Map<number, Response>();

export const SseRegistry = {
  register: (jobId: number, res: Response) => registry.set(jobId, res),
  send: (jobId: number, line: string) => {
    const res = registry.get(jobId);
    if (res) {
      try { res.write(`event: log\ndata: ${JSON.stringify(line)}\n\n`); } catch { registry.delete(jobId); }
    }
  },
  remove: (jobId: number) => registry.delete(jobId),
};
