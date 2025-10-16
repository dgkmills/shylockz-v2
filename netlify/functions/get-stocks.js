const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // IMPORTANT: The environment variable name has changed.
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is missing from server environment.' }),
        };
    }

    // You can now safely query all 6 symbols.
    const symbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];

    // This function fetches the data for a single stock from Finnhub.
    const getStockData = async (symbol) => {
        try {
            // --- Set up API URLs for Finnhub ---
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            
            // Calculate timestamps for the last 30 days of historical data.
            const to = Math.floor(Date.now() / 1000);
            const from = to - (30 * 24 * 60 * 60); // 30 days ago
            const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;

            // Fetch both quote and historical data concurrently.
            const [quoteResponse, candleResponse] = await Promise.all([
                fetch(quoteUrl),
                fetch(candleUrl),
            ]);

            const quoteData = await quoteResponse.json();
            const candleData = await candleResponse.json();

            // --- Error Handling & Data Validation ---
            if (quoteData.error || candleData.error) {
                 console.error(`Finnhub API Error for ${symbol}:`, quoteData.error || candleData.error);
                 return { symbol, error: quoteData.error || candleData.error };
            }
            // If 'c' (current price) is 0, the API often indicates no data is available.
            if (quoteData.c === 0) {
                return { symbol, error: 'No quote data available at this time.' };
            }

            // --- Format Data for the Frontend ---
            // The frontend expects the data in this specific structure.
            return {
                symbol: symbol,
                price: quoteData.c, // 'c' is current price
                changeAmount: quoteData.d, // 'd' is change
                changePercent: quoteData.dp, // 'dp' is percent change
                // 't' is a Unix timestamp, convert it to a readable time.
                lastTradeTime: new Date(quoteData.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                // 'c' in candle data is an array of closing prices.
                historicalData: candleData.c || [], 
            };
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, error: `Failed to fetch data.` };
        }
    };

    try {
        const results = await Promise.all(symbols.map(getStockData));
        return {
            statusCode: 200,
            body: JSON.stringify(results),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process stock data requests.' }),
        };
    }
};

