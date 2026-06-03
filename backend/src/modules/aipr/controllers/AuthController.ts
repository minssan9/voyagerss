import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({ refreshToken: z.string() });

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = LoginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: 'Invalid inputs', errors: result.error.flatten() });
        return;
      }
      const tokens = await authService.login(result.data.email, result.data.password);
      res.json(tokens);
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const result = RefreshSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: 'Invalid inputs', errors: result.error.flatten() });
        return;
      }
      const token = await authService.refresh(result.data.refreshToken);
      res.json(token);
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  }
}

export const authController = new AuthController();
