/**
 * Netlify serverless function to fetch stock data from an unofficial Yahoo Finance API endpoint.
 * This is intended to provide data that aligns with what users see on yahoo.com.
 * WARNING: This uses an unofficial API. It may be unstable or break without notice.
 */
exports.handler = async (event, context) => {
    const symbols = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'TSLA'];
    const symbolsString = symbols.join(',');
    const apiUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsString}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Yahoo Finance API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const { quoteResponse } = data;

        if (quoteResponse.error) {
            throw new Error(quoteResponse.error.description || 'Yahoo Finance API returned an error.');
        }

        // Map the Yahoo Finance response to the structure our frontend expects.
        const results = quoteResponse.result.map(stock => {
            // If essential data is missing, return an error object for this specific stock.
            if (stock.regularMarketPrice === undefined || stock.regularMarketPrice === null) {
                return { symbol: stock.symbol, error: 'Data not available from source.' };
            }
            return {
                symbol: stock.symbol,
                price: stock.regularMarketPrice,
                changeAmount: stock.regularMarketChange,
                changePercent: stock.regularMarketChangePercent,
                lastTradeTime: new Date(stock.regularMarketTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                historicalData: [], // Historical data is not available from this endpoint.
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(results),
        };

    } catch (error) {
        console.error('Error fetching data from Yahoo Finance:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to fetch data from Yahoo Finance. ${error.message}` }),
        };
    }
};
