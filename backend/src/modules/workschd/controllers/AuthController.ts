import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthService } from '../services/AuthService';
import { OAuth2Service } from '../services/OAuth2Service';
import { configService } from '../../../config/config-service';
import { IdentityPrismaService } from '../../identity/identity-prisma.service';
import { IdentityService } from '../../identity/identity.service';
import { IdentityOAuthService } from '../../identity/identity-oauth.service';
import { RbacPrismaService } from '../../../prisma/rbac-prisma.service';
import { RbacAssignmentService } from '../../rbac/rbac-assignment.service';
import { tApi } from '../../common/i18n-locale';

export class AuthController {
    private accountService: AccountService;
    private authService: AuthService;
    private oauth2Service: OAuth2Service;

    constructor() {
        const identityPrisma = new IdentityPrismaService();
        const identityService = new IdentityService(identityPrisma, new RbacAssignmentService(new RbacPrismaService()));
        const identityOAuthService = new IdentityOAuthService(identityService);
        this.accountService = new AccountService();
        this.authService = new AuthService(identityService);
        this.oauth2Service = new OAuth2Service(identityOAuthService);
    }

    getUserByAuth = async (req: Request, res: Response) => {
        try {
            const accountId = (req as any).user?.accountId;
            if (!accountId) return res.status(401).json({ message: 'Unauthorized' });

            const account = await this.accountService.getAccountById(accountId);
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
            return res.status(500).json({ message: tApi('auth.googleAuthFailed') });
        }
    };

    /**
     * Google OAuth2 콜백 처리
     */
    googleCallback = async (req: Request, res: Response) => {
        try {
            const { code } = req.query;

            if (!code || typeof code !== 'string') {
                return res.status(400).json({ message: tApi('auth.codeRequired') });
            }

            const result = await this.oauth2Service.handleGoogleCallback(code);

            // 프론트엔드로 리다이렉트 (토큰 포함)
            const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:8080')!;
            res.redirect(
                `${frontendUrl}/auth/callback?` +
                `accessToken=${result.accessToken}&` +
                `refreshToken=${result.refreshToken}`
            );
        } catch (error) {
            console.error('Google callback error:', error);
            const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:8080')!;
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
            return res.status(500).json({ message: tApi('auth.kakaoAuthFailed') });
        }
    };

    /**
     * Kakao OAuth2 콜백 처리
     */
    kakaoCallback = async (req: Request, res: Response) => {
        try {
            const { code } = req.query;

            if (!code || typeof code !== 'string') {
                return res.status(400).json({ message: tApi('auth.codeRequired') });
            }

            const result = await this.oauth2Service.handleKakaoCallback(code);

            // 프론트엔드로 리다이렉트 (토큰 포함)
            const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:8080')!;
            res.redirect(
                `${frontendUrl}/auth/callback?` +
                `accessToken=${result.accessToken}&` +
                `refreshToken=${result.refreshToken}`
            );
        } catch (error) {
            console.error('Kakao callback error:', error);
            const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:8080')!;
            res.redirect(`${frontendUrl}/login?error=oauth_failed`);
        }
    };
}
