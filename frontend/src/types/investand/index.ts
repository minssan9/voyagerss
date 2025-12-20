// MongoDB-like Document Interface
export interface MongoDocument {
    _id: string;
    createdAt: string;
    updatedAt: string;
}

// 1. External Data Source Types (Open API)
export interface OpenAPIStockPrice {
    ticker: string;
    price: number;
    last_updated: string;
    market_cap: number;
    vol: number;
    day_change_percent: number;
}

// 2. Database Schema Types (Stored in DB)
export interface AssetDocument extends MongoDocument {
    symbol: string;
    name: string;
    latestPrice: number;
    marketCap: string;
    volume: number;
    changePercent: number;
    lastSyncedAt: string;
}

export interface PortfolioDocument extends MongoDocument {
    assetSymbol: string;
    quantity: number;
    averageBuyPrice: number;
}

export interface TransactionDocument extends MongoDocument {
    type: 'BUY' | 'SELL';
    assetSymbol: string;
    amount: number;
    priceAtTransaction: number;
    status: 'COMPLETED' | 'PENDING';
}

// Added Types based on usage
export interface Stock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: string;
}

export interface HistoricalData {
    date: string;
    value: number;
}

export interface Transaction {
    id: string;
    date: string;
    type: 'BUY' | 'SELL';
    symbol: string;
    amount: number;
    price: number;
    status: string;
}

// Helper Types for Frontend Components
export interface PortfolioItem extends PortfolioDocument {
    currentValue: number;
    assetData: AssetDocument | null;
}

// Helper Type for AI Service Context
export interface AppDatabase {
    portfolio: {
        symbol: string;
        quantity: number;
        avgPrice: number;
        currentPrice: number;
        totalValue: number;
        allocation: number;
    }[];
    history: HistoricalData[];
    transactions: Transaction[];
    lastSync: string | null;
}

// Helper for the App State
export interface DashboardState {
    totalBalance: number;
    dailyChange: number;
    dailyChangePercent: number;
    portfolio: PortfolioItem[];
    assets: AssetDocument[];
    lastSync: string | null;
}

// Mock History Data
export const MOCK_HISTORY: HistoricalData[] = [
    { date: 'Jan', value: 85000 },
    { date: 'Feb', value: 88000 },
    { date: 'Mar', value: 87500 },
    { date: 'Apr', value: 91000 },
    { date: 'May', value: 89500 },
    { date: 'Jun', value: 93000 },
    { date: 'Jul', value: 95500 },
    { date: 'Aug', value: 94000 },
    { date: 'Sep', value: 97000 },
    { date: 'Oct', value: 100000 },
    { date: 'Nov', value: 102000 },
    { date: 'Dec', value: 105000 }
];


