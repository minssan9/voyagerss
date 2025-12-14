import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';

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
}
