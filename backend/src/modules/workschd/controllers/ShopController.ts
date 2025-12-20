import { Request, Response } from 'express';
import { ShopService } from '../services/ShopService';

const shopService = new ShopService();

export class ShopController {
    async createShop(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId);
            const data = { ...req.body, teamId };
            const shop = await shopService.createShop(data);
            res.status(200).json(shop);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getShopById(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId); // Verified but technically shopId is unique
            const id = Number(req.params.id);

            const shop = await shopService.getShopById(id);
            if (!shop) {
                return res.status(404).json({ message: 'Shop not found' });
            }
            if (shop.teamId !== teamId) {
                return res.status(403).json({ message: 'Shop does not belong to team' });
            }
            res.status(200).json(shop);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllShops(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId);
            const district = req.query.district as string;

            let shops;
            if (district) {
                shops = await shopService.findByTeamIdAndDistrict(teamId, district);
            } else {
                shops = await shopService.findByTeamId(teamId);
            }
            res.status(200).json(shops);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getActiveShops(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId);
            const shops = await shopService.findActiveStoresByTeamId(teamId);
            res.status(200).json(shops);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateShop(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId);
            const id = Number(req.params.id);

            // Should verify teamId match first
            const existing = await shopService.getShopById(id);
            if (!existing || existing.teamId !== teamId) {
                return res.status(403).json({ message: 'Shop forbidden or not found' });
            }

            await shopService.updateShop(id, req.body);
            res.status(200).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteShop(req: Request, res: Response) {
        try {
            const teamId = Number(req.params.teamId);
            const id = Number(req.params.id);

            // Verify
            const existing = await shopService.getShopById(id);
            if (!existing || existing.teamId !== teamId) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            await shopService.deleteShop(id);
            res.status(200).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
