import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { GlobalAssetApi, type NormalizedAssetData, type TimePeriod } from '@/api/investand/globalAssetApi';

export interface Asset {
    id: string;
    name: string;
    color: string;
    category: string;
}

export const ASSETS: Asset[] = [
    // Commodities
    { id: 'GOLD', name: 'Gold', color: '#FFD700', category: 'commodity' },
    { id: 'SILVER', name: 'Silver', color: '#C0C0C0', category: 'commodity' },
    { id: 'WTI', name: 'WTI Oil', color: '#000000', category: 'commodity' },
    // Indices
    { id: 'SPX', name: 'S&P 500', color: '#2563EB', category: 'index' },
    { id: 'NDX', name: 'Nasdaq 100', color: '#10B981', category: 'index' },
    { id: 'KOSPI', name: 'KOSPI', color: '#DC2626', category: 'index' },
    // Crypto
    { id: 'BTC', name: 'Bitcoin', color: '#F7931A', category: 'crypto' },
    // Forex
    { id: 'USDKRW', name: 'USD/KRW', color: '#3B82F6', category: 'forex' },
    { id: 'DXY', name: 'Dollar Index', color: '#059669', category: 'dollar_index' }
];

export const useMarketLabStore = defineStore('marketlab', () => {
    // State
    const activeAssets = ref<string[]>(['GOLD', 'SPX', 'USDKRW']);
    const timeRange = ref<TimePeriod>('1Y');
    const marketData = ref<NormalizedAssetData[]>([]);
    const loading = ref(false);

    // Actions
    async function generateMarketData() {
        loading.value = true;
        try {
            const response = await GlobalAssetApi.getNormalizedData(timeRange.value);
            if (response.data.success) {
                marketData.value = response.data.data;
            }
        } catch (e) {
            console.error('Failed to fetch market data', e);
        } finally {
            loading.value = false;
        }
    }

    function toggleAsset(assetId: string) {
        if (activeAssets.value.includes(assetId)) {
            if (activeAssets.value.length > 1) {
                activeAssets.value = activeAssets.value.filter(id => id !== assetId);
            }
        } else {
            activeAssets.value.push(assetId);
        }
    }

    function setTimeRange(range: TimePeriod) {
        timeRange.value = range;
        generateMarketData();
    }

    function resetAll() {
        activeAssets.value = ['GOLD', 'SPX', 'USDKRW'];
        timeRange.value = '1Y';
        generateMarketData();
    }

    // Getters
    const normalizedData = computed(() => {
        if (marketData.value.length === 0) return null;

        const selectedData = marketData.value.filter(asset =>
            activeAssets.value.includes(asset.assetCode)
        );

        if (selectedData.length === 0) return null;

        // Get all dates
        const allDates = new Set<string>();
        selectedData.forEach(asset => {
            asset.data.forEach(d => allDates.add(d.date));
        });

        const labels = Array.from(allDates).sort();

        const datasets = selectedData.map(asset => {
            const dataMap = new Map(asset.data.map(d => [d.date, d.normalizedValue]));

            return {
                label: asset.assetName,
                data: labels.map(label => dataMap.get(label) || null),
                borderColor: getAssetColor(asset.assetCode),
                backgroundColor: getAssetColor(asset.assetCode) + '20',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false
            };
        });

        return { labels, datasets };
    });

    function getAssetColor(assetCode: string): string {
        return ASSETS.find(a => a.id === assetCode)?.color || '#6B7280';
    }

    const assetDetails = computed(() => {
        return marketData.value.map(asset => {
            const lastData = asset.data.length > 0 ? asset.data[asset.data.length - 1] : null;
            const prevData = asset.data.length > 1 ? asset.data[asset.data.length - 2] : lastData;

            const current = lastData?.normalizedValue || 100;
            const prev = prevData?.normalizedValue || 100;
            const changePercent = ((current - prev) / prev) * 100;

            return {
                id: asset.assetCode,
                name: asset.assetName,
                category: asset.category,
                currentValue: current,
                changePercent,
                sparkline: asset.data.slice(-30).map(d => d.normalizedValue),
                color: getAssetColor(asset.assetCode)
            };
        });
    });

    return {
        activeAssets,
        timeRange,
        loading,
        generateMarketData,
        toggleAsset,
        setTimeRange,
        resetAll,
        normalizedData,
        assetDetails
    };
});
