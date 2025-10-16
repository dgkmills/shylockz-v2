/**
 * Netlify serverless function to fetch stock data from the Finnhub API.
 * === NEW: This version fetches additional data points for each stock. ===
 */
exports.handler = async (event, context) => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Finnhub API key is not configured.' }) };
    }

    const symbols = ['AAPL', 'NVDA', 'AMZN', 'GOOG', 'TSLA', 'META'];

    const getStockData = async (symbol) => {
        try {
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const response = await fetch(quoteUrl);
            if (!response.ok) throw new Error(`Finnhub API error for ${symbol}: ${response.statusText}`);
            const data = await response.json();

            if (data.error || data.c === 0) {
                return { symbol, error: data.error || 'No quote data.' };
            }

            // === NEW: Returning more data from the API ===
            // c = current price, d = change, dp = percent change
            // o = open, h = high, l = low, pc = previous close
            return {
                symbol: symbol,
                price: data.c,
                changeAmount: data.d,
                changePercent: data.dp,
                open: data.o,
                high: data.h,
                low: data.l,
                prevClose: data.pc,
            };
        } catch (error) {
            console.error(`Error for ${symbol}:`, error.message);
            return { symbol, error: 'Failed to fetch.' };
        }
    };

    try {
        const results = await Promise.all(symbols.map(getStockData));
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
            body: JSON.stringify(results),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process stock data.' }) };
    }
};

