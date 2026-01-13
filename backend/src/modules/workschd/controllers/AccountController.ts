import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthRequest } from '../middleware/authMiddleware';

export class AccountController {
    private accountService: AccountService;

    constructor() {
        this.accountService = new AccountService();
    }

    getAccount = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const account = await this.accountService.getAccountById(id);
            return res.json(account);
        } catch (error) {
            return res.status(500).json({ message: 'Error' });
        }
    };

    createAccount = async (req: Request, res: Response) => {
        try {
            const dto = req.body;
            const account = await this.accountService.registerForWorkschd(dto);
            return res.json(account);
        } catch (error) {
            return res.status(500).json({ message: 'Error' });
        }
    };

    updateProfile = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const accountId = req.user.accountId;
            const profileData = req.body;

            // Validate that user can only update their own profile
            if (req.params.id && parseInt(req.params.id) !== accountId) {
                return res.status(403).json({ message: 'Forbidden: Can only update own profile' });
            }

            const updatedAccount = await this.accountService.updateProfile(accountId, profileData);
            return res.json(updatedAccount);
        } catch (error: any) {
            console.error('Update profile error:', error);
            return res.status(500).json({ message: error.message || 'Error updating profile' });
        }
    };

    changePassword = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const accountId = req.user.accountId;
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({ message: 'Old password and new password are required' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters' });
            }

            await this.accountService.changePassword(accountId, oldPassword, newPassword);
            return res.json({ success: true, message: 'Password changed successfully' });
        } catch (error: any) {
            console.error('Change password error:', error);
            if (error.message === 'Current password is incorrect') {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: error.message || 'Error changing password' });
        }
    };
}
