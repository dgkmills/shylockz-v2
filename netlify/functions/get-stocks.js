/**
 * Netlify serverless function to fetch stock data from the Finnhub API.
 * This version fetches both the current quote and recent historical candle data for charts.
 */
exports.handler = async (event, context) => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.error('Finnhub API key is not configured in Netlify.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key is missing. Please configure it in Netlify.' }),
        };
    }

    const symbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];

    /**
     * Fetches both quote and historical data for a single stock symbol.
     * @param {string} symbol - The stock symbol (e.g., 'AAPL').
     * @returns {Promise<object>} A promise that resolves to the combined stock data object.
     */
    const getStockData = async (symbol) => {
        try {
            // --- Fetch Current Quote ---
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const quotePromise = fetch(quoteUrl).then(res => res.json());

            // --- Fetch Historical Data for Charts ---
            const to = Math.floor(Date.now() / 1000);
            const from = to - (24 * 60 * 60); // 24 hours ago
            const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=15&from=${from}&to=${to}&token=${apiKey}`;
            const candlePromise = fetch(candleUrl).then(res => res.json());
            
            // Wait for both API calls to complete
            const [quoteData, candleData] = await Promise.all([quotePromise, candlePromise]);

            // --- Process Data ---
            if (quoteData.error || quoteData.c === 0) {
                const errorMsg = quoteData.error || 'No quote data available.';
                console.error(`Finnhub API Error for ${symbol}:`, errorMsg);
                return { symbol, error: errorMsg };
            }

            const historicalData = candleData.c ? candleData.c.map((price, index) => {
                return { x: candleData.t[index] * 1000, y: price };
            }) : [];

            return {
                symbol: symbol,
                price: quoteData.c,
                changeAmount: quoteData.d,
                changePercent: quoteData.dp,
                lastTradeTime: new Date(quoteData.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                historicalData: historicalData,
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

