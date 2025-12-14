import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthService } from '../services/AuthService';

export class AuthController {
    private accountService: AccountService;
    private authService: AuthService;

    constructor() {
        this.accountService = new AccountService();
        this.authService = new AuthService();
    }

    getUserByAuth = async (req: Request, res: Response) => {
        try {
            // Assuming middleware populates req.user
            const userId = (req as any).user?.userId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const account = await this.accountService.getAccountById(userId);
            return res.json(account);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    registerUser = async (req: Request, res: Response) => {
        try {
            const accountDto = req.body;
            if (await this.accountService.existsByEmail(accountDto.email)) {
                return res.status(409).json({ message: 'Email already exists' });
            }

            const account = await this.accountService.registerForWorkschd(accountDto);
            return res.json(account);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    authenticateUser = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);

            if (!result) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Set headers as per original Java logic
            res.setHeader('Authorization', `Bearer ${result.accessToken}`);
            res.setHeader('RefreshToken', result.refreshToken);

            return res.json(result.accessToken);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };
}
