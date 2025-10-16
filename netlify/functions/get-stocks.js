// This is a Netlify serverless function. It will run on Netlify's servers.
// It's designed to securely fetch data from the Alpha Vantage API.

// We use the 'node-fetch' library to make HTTP requests, similar to the browser's fetch.
const fetch = require('node-fetch');

// The main handler for the serverless function.
// Netlify automatically passes in 'event' and 'context' objects.
exports.handler = async (event, context) => {
  // Retrieve the secret API key from the environment variables we set in the Netlify UI.
  // This is the secure way to handle API keys; they are never exposed to the user's browser.
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is missing.' }),
    };
  }

  // Define the list of stock symbols we want to track.
  const symbols = ['AAPL', 'META', 'NVDA', 'AMZN', 'GOOGL', 'MSFT'];

  // This function fetches both the latest quote and daily historical data for a single stock.
  const getStockData = async (symbol) => {
    try {
      // Create the URLs for the two API calls we need to make.
      const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
      const dailyUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;

      // Use Promise.all to make both API requests concurrently for efficiency.
      const [quoteResponse, dailyResponse] = await Promise.all([
        fetch(quoteUrl),
        fetch(dailyUrl),
      ]);
      
      // Parse the JSON responses from the API.
      const quoteData = await quoteResponse.json();
      const dailyData = await dailyResponse.json();

      // Important: Check if the API returned an error or note (e.g., rate limit).
      if (quoteData['Note'] || dailyData['Note']) {
        console.warn(`Alpha Vantage API rate limit likely reached for ${symbol}.`);
        return { symbol, error: 'API rate limit reached. Please wait a minute and try again.' };
      }
       if (quoteData['Error Message'] || dailyData['Error Message']) {
        console.error(`API Error for ${symbol}:`, quoteData['Error Message'] || dailyData['Error Message']);
        return { symbol, error: 'Invalid API call. Check symbol.' };
       }

      // Extract the specific data points we need from the "Global Quote" object.
      const globalQuote = quoteData['Global Quote'];
      if (!globalQuote || Object.keys(globalQuote).length === 0) {
        return { symbol, error: 'No quote data found for symbol.' };
      }

      // Extract the historical data. The key is "Time Series (Daily)".
      const timeSeries = dailyData['Time Series (Daily)'];
      if (!timeSeries) {
          return { symbol, error: 'No time series data found for symbol.'};
      }
      
      // Get the last 30 days of closing prices for the sparkline chart.
      const history = Object.values(timeSeries)
        .slice(0, 30)
        .map(day => parseFloat(day['4. close']))
        .reverse(); // Reverse to have the oldest data first for the chart.

      // Assemble a clean, structured object for this stock.
      return {
        symbol: globalQuote['01. symbol'],
        price: parseFloat(globalQuote['05. price']),
        change: parseFloat(globalQuote['09. change']),
        changePercent: parseFloat(globalQuote['10. change percent'].replace('%', '')),
        latestTrade: globalQuote['07. latest trading day'],
        history: history,
      };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return { symbol, error: `Failed to fetch data for ${symbol}.` };
    }
  };

  try {
    // Use Promise.all to fetch data for all stock symbols concurrently.
    // This is much faster than fetching them one by one in a loop.
    const results = await Promise.all(symbols.map(symbol => getStockData(symbol)));
    
    // Return a successful HTTP response (200 OK) with the array of stock data.
    // The frontend will receive this JSON data.
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    // If anything goes wrong in the process, return a 500 Internal Server Error.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch stock data.' }),
    };
  }
};
