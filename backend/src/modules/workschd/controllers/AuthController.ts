import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthService } from '../services/AuthService';
import { OAuth2Service } from '../services/OAuth2Service';

export class AuthController {
    private accountService: AccountService;
    private authService: AuthService;
    private oauth2Service: OAuth2Service;

    constructor() {
        this.accountService = new AccountService();
        this.authService = new AuthService();
        this.oauth2Service = new OAuth2Service();
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

    /**
     * Google OAuth2 로그인 시작
     */
    googleAuth = async (req: Request, res: Response) => {
        try {
            const authUrl = this.oauth2Service.getGoogleAuthUrl();
            res.redirect(authUrl);
        } catch (error) {
            console.error('Google auth error:', error);
            return res.status(500).json({ message: 'Google 인증 실패' });
        }
    };

    /**
     * Google OAuth2 콜백 처리
     */
    googleCallback = async (req: Request, res: Response) => {
        try {
            const { code } = req.query;

            if (!code || typeof code !== 'string') {
                return res.status(400).json({ message: 'Code가 필요합니다' });
            }

            const result = await this.oauth2Service.handleGoogleCallback(code);

            // 프론트엔드로 리다이렉트 (토큰 포함)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(
                `${frontendUrl}/auth/callback?` +
                `accessToken=${result.accessToken}&` +
                `refreshToken=${result.refreshToken}`
            );
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    };

    /**
     * Kakao OAuth2 로그인 시작
     */
    kakaoAuth = async (req: Request, res: Response) => {
        try {
            const authUrl = this.oauth2Service.getKakaoAuthUrl();
            res.redirect(authUrl);
        } catch (error) {
            console.error('Kakao auth error:', error);
            return res.status(500).json({ message: 'Kakao 인증 실패' });
        }
    };

    /**
     * Kakao OAuth2 콜백 처리
     */
    kakaoCallback = async (req: Request, res: Response) => {
        try {
            const { code } = req.query;

            if (!code || typeof code !== 'string') {
                return res.status(400).json({ message: 'Code가 필요합니다' });
            }

            const result = await this.oauth2Service.handleKakaoCallback(code);

            // 프론트엔드로 리다이렉트 (토큰 포함)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(
                `${frontendUrl}/auth/callback?` +
                `accessToken=${result.accessToken}&` +
                `refreshToken=${result.refreshToken}`
            );
        } catch (error) {
            console.error('Kakao callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    };
}
