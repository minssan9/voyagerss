import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { aiprConfigService } from '../../../config/aipr-config-service';
import { aiprPrisma as prisma } from '../../../config/prisma';
import type { AiprRequest } from './auth';

export interface LogTokenPayload {
  sub: string;
  runId: string;
  issueId: string;
  type: 'log_token';
}

export interface LogTokenRequest extends Request {
  logToken?: LogTokenPayload;
}

export function signLogToken(adminId: string, issueId: string, runId: string): { token: string; expiresAt: string } {
  const secret = aiprConfigService.get('JWT_SECRET', 'dev-secret')!;
  const expiresIn = 15 * 60;
  const token = jwt.sign(
    { sub: adminId, runId, issueId, type: 'log_token' },
    secret,
    { expiresIn },
  );
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { token, expiresAt };
}

/** Accept Bearer JWT or ?token= short-lived log token for SSE */
export async function aiprLogAuthMiddleware(req: LogTokenRequest & AiprRequest, res: Response, next: NextFunction) {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

  if (queryToken) {
    try {
      const secret = aiprConfigService.get('JWT_SECRET', 'dev-secret')!;
      const decoded = jwt.verify(queryToken, secret) as LogTokenPayload;
      if (decoded.type !== 'log_token') {
        res.status(401).json({ message: 'Invalid log token' });
        return;
      }
      const runId = typeof req.query.runId === 'string' ? req.query.runId : '';
      const issueId = req.params.issueId ?? req.params.id;
      if (decoded.runId !== runId || decoded.issueId !== issueId) {
        res.status(403).json({ message: 'Log token scope mismatch' });
        return;
      }
      const run = await prisma.run.findFirst({ where: { id: runId, issueId: String(issueId) } });
      if (!run) {
        res.status(404).json({ message: 'Run not found' });
        return;
      }
      req.logToken = decoded;
      next();
      return;
    } catch {
      res.status(401).json({ message: 'Invalid or expired log token' });
      return;
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: missing token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = aiprConfigService.get('JWT_SECRET', 'dev-secret')!;
    const decoded = jwt.verify(token, secret) as { sub: string; email?: string; role?: string };
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
}
