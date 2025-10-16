/**
 * Netlify serverless function to fetch stock data from the Finnhub API.
 * This is the stable, reliable version using a professional API.
 */
exports.handler = async (event, context) => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is not configured.' }),
        };
    }

    // This list matches the frontend in index.html
    const symbols = ['AAPL', 'NVDA', 'AMZN', 'GOOG', 'TSLA', 'META'];

    const getStockData = async (symbol) => {
        try {
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const response = await fetch(quoteUrl);
            const quoteData = await response.json();

            if (quoteData.error || quoteData.c === 0) {
                return { symbol, error: quoteData.error || 'No quote data available.' };
            }

            // The Finnhub API provides the "live" data your friend wants:
            // c = current price (last trade)
            // d = change
            // dp = percent change
            return {
                symbol: symbol,
                price: quoteData.c,
                changeAmount: quoteData.d,
                changePercent: quoteData.dp,
            };
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, error: 'Failed to fetch API data.' };
        }
    };

    try {
        const results = await Promise.all(symbols.map(getStockData));
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // Add a short cache time to prevent hitting API limits too aggressively
                'Cache-Control': 'public, max-age=15'
            },
            body: JSON.stringify(results),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process stock data.' }),
        };
    }
};

