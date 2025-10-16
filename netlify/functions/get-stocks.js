/**
 * Netlify serverless function to fetch stock data from the Finnhub API.
 * This function is designed to run on Netlify's free tier.
 * It now ONLY fetches the current quote data to avoid using premium API endpoints.
 */
exports.handler = async (event, context) => {
    // Retrieve the API key securely from Netlify's environment variables.
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.error('Finnhub API key is not configured in Netlify.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Finnhub API key is missing.' }),
        };
    }

    const symbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];

    /**
     * Fetches quote data for a single stock symbol.
     * @param {string} symbol - The stock symbol (e.g., 'AAPL').
     * @returns {Promise<object>} A promise that resolves to the stock data object.
     */
    const getStockData = async (symbol) => {
        try {
            // This endpoint for current quote data is free.
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const quoteResponse = await fetch(quoteUrl);
            
            if (!quoteResponse.ok) {
                throw new Error(`Finnhub API responded with status: ${quoteResponse.status}`);
            }

            const quoteData = await quoteResponse.json();

            // Handle potential errors or empty data from the API.
            if (quoteData.error) {
                 console.error(`Finnhub API Error for ${symbol}:`, quoteData.error);
                 return { symbol, error: quoteData.error };
            }
            if (quoteData.c === 0) {
                return { symbol, error: 'No quote data available.' };
            }

            // Return a structured object for the frontend.
            // historicalData is now an empty array, as we are no longer fetching it.
            return {
                symbol: symbol,
                price: quoteData.c,
                changeAmount: quoteData.d,
                changePercent: quoteData.dp,
                lastTradeTime: new Date(quoteData.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                historicalData: [], // Send an empty array to the chart.
            };
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, error: `Failed to fetch data.` };
        }
    };

    try {
        // Fetch data for all symbols concurrently for better performance.
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
