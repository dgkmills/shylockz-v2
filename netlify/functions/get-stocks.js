/**
 * Netlify serverless function to fetch stock data from the Finnhub API.
 * This is the stable, recommended version using an official, documented API.
 */
exports.handler = async (event, context) => {
    // IMPORTANT: Make sure your FINNHUB_API_KEY is set in your Netlify site settings.
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.error('Finnhub API key is not configured in Netlify.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key is missing. Please configure it in Netlify.' }),
        };
    }

    const symbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];

    const getStockData = async (symbol) => {
        try {
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const quoteResponse = await fetch(quoteUrl);
            
            if (!quoteResponse.ok) {
                throw new Error(`Finnhub API responded with status: ${quoteResponse.status}`);
            }

            const quoteData = await quoteResponse.json();

            if (quoteData.error || quoteData.c === 0) {
                 const errorMsg = quoteData.error || 'No quote data available.';
                 console.error(`Finnhub API Error for ${symbol}:`, errorMsg);
                 return { symbol, error: errorMsg };
            }

            return {
                symbol: symbol,
                price: quoteData.c,
                changeAmount: quoteData.d,
                changePercent: quoteData.dp,
                lastTradeTime: new Date(quoteData.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                historicalData: [], // Charts are disabled in this stable version.
            };
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, error: 'Failed to fetch data.' };
        }
    };

    try {
        const results = await Promise.all(symbols.map(getStockData));
        return {
            statusCode: 200,
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error('Failed to process stock data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process stock data.' }),
        };
    }
};
