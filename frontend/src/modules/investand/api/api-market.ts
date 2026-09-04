import service from '@/api/common/axios-voyagerss';

export interface MarketHistoryItem {
    symbol: string;
    date: string;
    close: number;
    volume: number;
}

export const MarketApi = {
    getHistory(assetId: string, days: number = 365) {
        return service.get<{ success: boolean; data: MarketHistoryItem[] }>(`/investand/findash/market/history/${assetId}`, {
            params: { days }
        });
    },

    // Future expansion: get snapshot
    // getSnapshot(assetId: string) ...
};
