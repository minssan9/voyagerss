import { Shop } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';

export class ShopService {
    async createShop(data: any): Promise<Shop> {
        return await prisma.shop.create({
            data: {
                teamId: data.teamId,
                name: data.name,
                district: data.district,
                status: data.status || 'ACTIVE',
                address: data.address
            }
        });
    }

    async getShopById(id: number): Promise<Shop | null> {
        return await prisma.shop.findUnique({
            where: { id }
        });
    }

    async updateShop(id: number, data: any): Promise<void> {
        await prisma.shop.update({
            where: { id },
            data: {
                name: data.name,
                district: data.district,
                status: data.status,
                address: data.address
            }
        });
    }

    async deleteShop(id: number): Promise<void> {
        await prisma.shop.delete({
            where: { id }
        });
    }

    async findByTeamId(teamId: number): Promise<Shop[]> {
        return await prisma.shop.findMany({
            where: { teamId }
        });
    }

    async findByTeamIdAndDistrict(teamId: number, district: string): Promise<Shop[]> {
        return await prisma.shop.findMany({
            where: {
                teamId,
                district
            }
        });
    }

    async findActiveStoresByTeamId(teamId: number): Promise<Shop[]> {
        return await prisma.shop.findMany({
            where: {
                teamId,
                status: 'ACTIVE'
            }
        });
    }
}
