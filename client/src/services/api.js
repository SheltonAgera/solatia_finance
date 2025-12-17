// The base URL of your backend server
const API_URL = 'http://localhost:5000/api';

/**
 * Fetch stock data for a specific symbol (e.g., 'AAPL')
 */
export const getStockData = async (symbol) => {
  try {
    const response = await fetch(`${API_URL}/stock/${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch stock');
    return await response.json();
  } catch (error) {
    console.error("Stock API Error:", error);
    return null; // Return null if it fails so the UI knows
  }
};

/**
 * Fetch the latest market news
 */
export const getMarketNews = async () => {
  try {
    const response = await fetch(`${API_URL}/news`);
    if (!response.ok) throw new Error('Failed to fetch news');
    return await response.json();
  } catch (error) {
    console.error("News API Error:", error);
    return []; // Return empty array so UI doesn't break
  }
};