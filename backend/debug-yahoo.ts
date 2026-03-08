const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function debugEnv() {
    console.log('Node version:', process.versions.node);
    console.log('Waiting 30s for rate limit to clear...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log('Environment check with MSFT...');
    try {
        const quote = await yahooFinance.quote('MSFT');
        console.log('Quote fetched:', quote.symbol);
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugEnv();
