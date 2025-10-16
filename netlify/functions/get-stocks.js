const cheerio = require('cheerio');

/**
 * Netlify serverless function to SCRAPE stock data directly from Yahoo Finance.
 * NOTE: This is a fragile, short-term solution designed to win a bet.
 * It will break if Yahoo Finance changes their website's HTML structure.
 */
exports.handler = async (event, context) => {
    const symbols = ['AAPL', 'NVDA', 'AMZN', 'GOOG', 'TSLA', 'META'];

    const getStockData = async (symbol) => {
        try {
            // We'll add a random user-agent to make our request look more like a real browser.
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            };

            const response = await fetch(`https://finance.yahoo.com/quote/${symbol}`, { headers });
            if (!response.ok) {
                throw new Error(`Failed to fetch Yahoo page for ${symbol}. Status: ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // This is the fragile part. We're looking for a specific element that contains the price.
            // As of now, Yahoo uses a 'fin-streamer' element with a 'data-field' attribute.
            const priceSelector = `fin-streamer[data-symbol='${symbol}'][data-field='regularMarketPrice']`;
            const priceElement = $(priceSelector);

            if (priceElement.length === 0) {
                throw new Error(`Could not find price element for ${symbol}. The scraper might be broken.`);
            }

            const price = parseFloat(priceElement.attr('value'));
            
            // Scrape the change values as well.
            const changeAmountSelector = `fin-streamer[data-symbol='${symbol}'][data-field='regularMarketChange']`;
            const changePercentSelector = `fin-streamer[data-symbol='${symbol}'][data-field='regularMarketChangePercent']`;
            
            const changeAmount = parseFloat($(changeAmountSelector).attr('value'));
            const changePercent = parseFloat($(changePercentSelector).attr('value'));

            // The scraper doesn't get historical data, so we'll return an empty array for the chart.
            // The price is all that matters for the bet.
            return {
                symbol: symbol,
                price: price,
                changeAmount: changeAmount || 0,
                changePercent: changePercent || 0,
                historicalData: [], 
                source: 'Yahoo Scraper'
            };

        } catch (error) {
            console.error(`Error scraping data for ${symbol}:`, error.message);
            return { symbol, error: `Scraping failed: ${error.message}` };
        }
    };

    try {
        const results = await Promise.all(symbols.map(getStockData));
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // We MUST disable caching to ensure we get live scrapes every time.
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error('Failed to process stock data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process scraped data.' }),
        };
    }
};

