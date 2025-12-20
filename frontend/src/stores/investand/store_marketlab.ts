import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MarketApi } from '@/api/findash/api-market';

export interface Asset {
    id: string;
    name: string;
    color: string;
    category: string;
    volatility: number;
}

export const ASSETS: Asset[] = [
    { id: 'gold', name: 'Gold', color: '#D4AF37', category: 'Commodity', volatility: 0.8 },
    { id: 'silver', name: 'Silver', color: '#C0C0C0', category: 'Commodity', volatility: 1.2 },
    { id: 'copper', name: 'Copper', color: '#B87333', category: 'Commodity', volatility: 1.0 },
    { id: 'wti', name: 'WTI Oil', color: '#000000', category: 'Energy', volatility: 1.5 },
    { id: 'usdkrw', name: 'USD/KRW', color: '#2b6cb0', category: 'Forex', volatility: 0.4 },
    { id: 'snp500', name: 'S&P 500', color: '#2f855a', category: 'Index', volatility: 0.9 },
    { id: 'kospi', name: 'KOSPI', color: '#c53030', category: 'Index', volatility: 1.1 },
    { id: 'nikkei', name: 'Nikkei 225', color: '#805ad5', category: 'Index', volatility: 1.0 }
];

export const useMarketLabStore = defineStore('marketlab', () => {
    // State
    const activeAssets = ref<string[]>(['gold', 'usdkrw', 'snp500']);
    const timeRange = ref<'1M' | '3M' | '6M' | '1Y'>('1Y');
    const marketData = ref<{ labels: string[], datasets: Record<string, number[]> } | null>(null);

    // Actions
    async function generateMarketData() {
        const totalDays = 365;
        // Reset data
        const labels: string[] = [];
        const datasets: Record<string, number[]> = {};

        // Initialize datasets
        activeAssets.value.forEach(id => datasets[id] = []);

        try {
            // Fetch data for all active assets
            const promises = activeAssets.value.map(id => MarketApi.getHistory(id, totalDays));
            const results = await Promise.all(promises);

            // Process results
            const dateSet = new Set<string>();
            const dataMap: Record<string, Record<string, number>> = {};

            results.forEach((res, index) => {
                const assetId = activeAssets.value[index];
                const cleanData = res.data.data || [];

                dataMap[assetId] = {};
                cleanData.forEach(item => {
                    const d = item.date.split('T')[0];
                    dateSet.add(d);
                    dataMap[assetId][d] = item.close;
                });
            });

            // Sort dates
            labels.push(...Array.from(dateSet).sort());

            // Fill datasets (handle missing data for gaps)
            labels.forEach(date => {
                activeAssets.value.forEach(assetId => {
                    const val = dataMap[assetId]?.[date];
                    const dataset = datasets[assetId];
                    // Simple gap filling: use last pushed value or 0
                    const lastVal = dataset.length > 0 ? dataset[dataset.length - 1] : 0;
                    dataset.push(val || lastVal);
                });
            });

            marketData.value = { labels, datasets };

        } catch (e) {
            console.error('Failed to fetch market data', e);
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

    function setTimeRange(range: '1M' | '3M' | '6M' | '1Y') {
        timeRange.value = range;
    }

    function resetAll() {
        activeAssets.value = ['gold', 'usdkrw', 'snp500'];
        timeRange.value = '1Y';
        generateMarketData();
    }

    // Getters
    const normalizedData = computed(() => {
        if (!marketData.value) return null;

        let daysToKeep = 365;
        if (timeRange.value === '1M') daysToKeep = 30;
        if (timeRange.value === '3M') daysToKeep = 90;
        if (timeRange.value === '6M') daysToKeep = 180;

        const startIndex = Math.max(0, marketData.value.labels.length - daysToKeep);
        const slicedLabels = marketData.value.labels.slice(startIndex);

        const datasets = ASSETS
            .filter(asset => activeAssets.value.includes(asset.id))
            .map(asset => {
                const rawValues = marketData.value!.datasets[asset.id].slice(startIndex);
                // Avoid division by zero
                const baseValue = rawValues.length > 0 ? rawValues[0] || 100 : 100;
                const normalizedValues = rawValues.map(v => (v / baseValue) * 100);

                return {
                    label: asset.name,
                    data: normalizedValues,
                    borderColor: asset.color,
                    backgroundColor: asset.color,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.1,
                    fill: false
                };
            });

        return {
            labels: slicedLabels,
            datasets
        };
    });

    const assetDetails = computed(() => {
        if (!marketData.value) return [];

        return ASSETS.map(asset => {
            const rawData = marketData.value!.datasets[asset.id] || [];
            if (rawData.length === 0) return { ...asset, currentValue: 0, changePercent: 0, sparkline: [] };

            const current = rawData[rawData.length - 1];
            const prev = rawData.length > 1 ? rawData[rawData.length - 2] : current;
            const changePercent = prev !== 0 ? ((current - prev) / prev) * 100 : 0;

            return {
                ...asset,
                currentValue: current,
                changePercent,
                sparkline: rawData.slice(-30)
            };
        });
    });

    return {
        activeAssets,
        timeRange,
        generateMarketData,
        toggleAsset,
        setTimeRange,
        resetAll,
        normalizedData,
        assetDetails
    };
});
