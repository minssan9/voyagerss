import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { workschdPrisma as prisma } from '../../../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    accountId: number;
    email: string;
    roles: string[];
  };
}

/**
 * JWT 인증 미들웨어
 * Authorization 헤더에서 토큰을 추출하고 검증
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // JWT 토큰 검증
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded.accountId) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    // 사용자 및 역할 조회
    const account = await prisma.account.findUnique({
      where: { accountId: decoded.accountId },
      include: { accountRoles: true }
    });

    if (!account || account.status !== 'ACTIVE') {
      res.status(401).json({ message: 'Invalid token or inactive account' });
      return;
    }

    // req.user에 사용자 정보 저장
    req.user = {
      accountId: account.accountId,
      email: account.email || '',
      roles: account.accountRoles.map(r => r.roleType)
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

/**
 * 역할 기반 접근 제어 미들웨어
 * @param roles 허용할 역할 목록
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        message: 'Forbidden',
        requiredRoles: roles,
        userRoles: req.user.roles
      });
      return;
    }

    next();
  };
};

/**
 * 팀장 권한 확인 미들웨어
 * ADMIN 또는 TEAM_LEADER 역할 필요
 */
export const isTeamLeader = authorize('ADMIN', 'TEAM_LEADER');

/**
 * 도우미 권한 확인 미들웨어
 * ADMIN, TEAM_LEADER, HELPER 역할 필요
 */
export const isHelper = authorize('ADMIN', 'TEAM_LEADER', 'HELPER');

/**
 * 관리자 권한 확인 미들웨어
 * ADMIN 역할만 허용
 */
export const isAdmin = authorize('ADMIN');

/**
 * 팀 소유권 확인 미들웨어
 * 특정 팀의 리더인지 확인
 */
export const isTeamOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const teamId = parseInt(req.params.teamId || req.body.teamId);

    if (!teamId) {
      res.status(400).json({ message: 'Team ID is required' });
      return;
    }

    // ADMIN은 모든 팀에 접근 가능
    if (req.user.roles.includes('ADMIN')) {
      next();
      return;
    }

    // 팀 멤버십 및 역할 확인
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        accountId: req.user.accountId,
        role: 'LEADER'
      }
    });

    if (!teamMember) {
      res.status(403).json({ message: 'Not a team leader' });
      return;
    }

    next();
  } catch (error) {
    console.error('Team ownership check error:', error);
    res.status(500).json({ message: 'Failed to verify team ownership' });
  }
};

/**
 * Task 소유권 확인 미들웨어
 * Task를 생성한 사용자인지 확인
 */
export const isTaskOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const taskId = parseInt(req.params.id || req.params.taskId);

    if (!taskId) {
      res.status(400).json({ message: 'Task ID is required' });
      return;
    }

    // ADMIN은 모든 Task에 접근 가능
    if (req.user.roles.includes('ADMIN')) {
      next();
      return;
    }

    // Task 조회 및 소유권 확인
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (task.createdBy !== req.user.accountId) {
      res.status(403).json({ message: 'Not the task owner' });
      return;
    }

    next();
  } catch (error) {
    console.error('Task ownership check error:', error);
    res.status(500).json({ message: 'Failed to verify task ownership' });
  }
};
