require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const vader = require('vader-sentiment');
const TelegramBot = require('node-telegram-bot-api');
const util = require('util');

// --- 1. UNIVERSAL IMPORT FIX ---
const pkg = require('yahoo-finance2');
let yahooFinance;
if (typeof pkg.default === 'function') yahooFinance = new pkg.default();
else if (pkg.default) yahooFinance = pkg.default;
else yahooFinance = pkg;

if (yahooFinance && typeof yahooFinance.setGlobalConfig === 'function') {
  yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
}

// =================================================================
// 2. CONFIGURATION & CHECKS
// =================================================================
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, NEWS_API_KEY } = process.env;

// Check for Critical Keys
if (!NEWS_API_KEY) console.warn("⚠️ WARNING: NEWS_API_KEY is missing in .env! News features will fail.");

// =================================================================
// 3. DATABASE
// =================================================================
class Database {
  constructor() {
    this.db = new sqlite3.Database('./solatia.db', (err) => {
      if (err) console.error('❌ DB Error:', err.message);
      else console.log('✅ Connected to Solatia DB');
    });
    this.run = util.promisify(this.db.run.bind(this.db));
    this.all = util.promisify(this.db.all.bind(this.db));
    this.get = util.promisify(this.db.get.bind(this.db));
    this.init();
  }
  async init() {
    try {
      await this.run(`CREATE TABLE IF NOT EXISTS market_data (id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT, price REAL, volume INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await this.run(`CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT, message TEXT, severity TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await this.run(`CREATE TABLE IF NOT EXISTS stock_config (symbol TEXT PRIMARY KEY, price_threshold REAL DEFAULT 2.0, sentiment_threshold REAL DEFAULT 0.2)`);
    } catch (e) {}
  }
  close() { this.db.close(); }
}
const db = new Database();

// =================================================================
// 4. TELEGRAM & ANALYSIS
// =================================================================
let bot = null;
if (TELEGRAM_TOKEN && TELEGRAM_CHAT_ID) {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
  console.log("✅ Sentinel Active");
}

const sendTelegramAlert = async (symbol, message) => {
  if (!bot) return;
  try { await bot.sendMessage(TELEGRAM_CHAT_ID, `🚨 **SOLATIA:** ${symbol}\n${message}`, { parse_mode: 'Markdown' }); } 
  catch (e) {}
};

const AnalysisEngine = {
  calculateRSI: (closes, period = 14) => {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change; else losses += Math.abs(change);
    }
    let avgGain = gains / period, avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) { avgGain = (avgGain * (period - 1) + change) / period; avgLoss = (avgLoss * (period - 1)) / period; } 
      else { avgGain = (avgGain * (period - 1)) / period; avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period; }
    }
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + (avgGain / avgLoss)));
  },
  
  analyzeNewsContext: (text, symbol) => {
    const lowerText = text.toLowerCase();
    const cleanSym = symbol ? symbol.split('.')[0].toLowerCase() : '';
    let relevance = 'Market-Wide';
    if (cleanSym && lowerText.includes(cleanSym)) relevance = 'Direct';
    else if (lowerText.includes('sector') || lowerText.includes('industry')) relevance = 'Sector';
    return { relevance };
  },

  // INTERNAL HELPER FOR SCORES
  fetchLiveSentiment: async (symbol) => {
    try {
      const cleanSymbol = symbol.split('.')[0];
      // Use simple query for score calculation
      const query = `${cleanSymbol} AND (stock OR finance)`;
      
      const res = await axios.get(`https://newsapi.org/v2/everything`, { 
        params: { q: query, apiKey: NEWS_API_KEY, sortBy: 'relevancy', pageSize: 10, language: 'en' } 
      });
      const articles = res.data.articles || [];
      if (!articles.length) return 0;
      
      let total = 0;
      articles.forEach(a => { 
        const t = (a.title + " " + a.description).substring(0,500);
        total += vader.SentimentIntensityAnalyzer.polarity_scores(t).compound; 
      });
      return total / articles.length; 
    } catch (e) { return 0; }
  }
};

// =================================================================
// 5. API ROUTES
// =================================================================

// --- STOCK DATA ---
app.get('/api/stock/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.quote(symbol);
    const deepData = await yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics'] });
    const summary = deepData.summaryDetail || {};
    const finance = deepData.financialData || {};
    const stats = deepData.defaultKeyStatistics || {};

    let rsiValue = 50;
    try {
      const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - 7776000000).toISOString().split('T')[0], interval: '1d' });
      if(chart.quotes) rsiValue = AnalysisEngine.calculateRSI(chart.quotes.map(q=>q.close).filter(c=>c));
    } catch(e) {}

    res.json({
      symbol: quote.symbol, name: quote.shortName, price: quote.regularMarketPrice, change: quote.regularMarketChangePercent, currency: quote.currency,
      details: {
        peRatio: summary.trailingPE || quote.trailingPE || null,
        pegRatio: stats.pegRatio || summary.pegRatio || null,
        marketCap: quote.marketCap || summary.marketCap || null,
        dividendYield: summary.dividendYield || quote.dividendYield || null,
        roe: finance.returnOnEquity || null, roa: finance.returnOnAssets || null,
        profitMargin: finance.profitMargins || summary.profitMargins || null,
        operatingMargin: finance.operatingMargins || null,
        debtToEquity: finance.debtToEquity || null,
        priceToBook: stats.priceToBook || summary.priceToBook || null,
        currentRatio: finance.currentRatio || null,
        beta: summary.beta || stats.beta || null,
        rsi: rsiValue
      }
    });
  } catch (err) { next(err); }
});

// --- NEWS (FIXED & LOGGING ADDED) ---
app.get('/api/news', async (req, res) => {
  try {
    const { symbol } = req.query;
    let cleanSymbol = symbol ? symbol.split('.')[0] : 'finance';
    let query = cleanSymbol;

    if (symbol) {
      let companyName = "";
      try { 
        const q = await yahooFinance.quote(symbol); 
        // Get name and strip legal entities for broader search
        companyName = (q.longName || q.shortName || cleanSymbol).replace(/ (Limited|Ltd|Inc|Corp|Corporation)\.?$/i, "");
      } catch (e) {}

      // SIMPLIFIED QUERY: "Name" OR Ticker
      query = `"${companyName}" OR ${cleanSymbol}`;
    }

    console.log(`📰 Searching News for: ${query}`); // <--- CHECK THIS IN YOUR TERMINAL

    const r = await axios.get(`https://newsapi.org/v2/everything`, { 
        params: { q: query, apiKey: NEWS_API_KEY, sortBy: 'publishedAt', pageSize: 12, language: 'en' } 
    });
    
    const articles = r.data.articles.map(a => {
        const t = (a.title + " " + a.description).substring(0, 500);
        const score = vader.SentimentIntensityAnalyzer.polarity_scores(t).compound;
        return {
            ...a,
            sentiment: { 
                score, label: score > 0.05 ? 'Bullish' : score < -0.05 ? 'Bearish' : 'Neutral',
                confidence: Math.abs(score * 100).toFixed(0)
            },
            context: AnalysisEngine.analyzeNewsContext(t, cleanSymbol)
        };
    });
    res.json(articles);
  } catch (e) { 
    console.error("News API Error:", e.response ? e.response.data : e.message); 
    res.json([]); 
  }
});

// --- CHARTS ---
app.get('/api/market-data/:symbol', async (req, res) => {
  try {
    const { range } = req.query;
    const today = new Date();
    const p1 = new Date();
    let opts = { period1: '2023-01-01', interval: '1d' };
    
    if(range === '1d') { p1.setDate(today.getDate()-3); opts = { period1: p1.toISOString().split('T')[0], interval: '2m' }; }
    else if(range === '1w') { p1.setDate(today.getDate()-7); opts = { period1: p1.toISOString().split('T')[0], interval: '15m' }; }
    else { p1.setFullYear(today.getFullYear()-1); opts = { period1: p1.toISOString().split('T')[0], interval: '1d' }; }
    
    const r = await yahooFinance.chart(req.params.symbol, opts);
    res.json(r.quotes.map(q => ({ x: new Date(q.date).getTime(), y: [q.open, q.high, q.low, q.close] })).filter(c=>c.y[0]));
  } catch(e) { res.status(500).send(e.message); }
});

// --- LIVE SCORES ---
app.get('/api/scores/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const sentiment = await AnalysisEngine.fetchLiveSentiment(symbol);
    const quote = await yahooFinance.quote(symbol);
    const avgVol = quote.averageDailyVolume3Month || 1;
    const rvol = (quote.regularMarketVolume || 1) / (avgVol / 6.5); 
    
    let anomalyScore = 0;
    if (rvol > 1.5) anomalyScore += 30;
    if (rvol > 3.0) anomalyScore += 30;
    if (Math.abs(quote.regularMarketChangePercent) > 2.0) anomalyScore += 20;
    if (Math.abs(quote.regularMarketChangePercent) > 5.0) anomalyScore += 20;
    
    res.json({ sentiment, anomaly: Math.min(anomalyScore, 100) });
  } catch(e) { res.json({ sentiment: 0, anomaly: 0 }); }
});

// --- CONFIG ---
app.get('/api/config/:symbol', async (req, res) => {
  try {
    const row = await db.get("SELECT * FROM stock_config WHERE symbol = ?", [req.params.symbol]);
    res.json(row || { price_threshold: 2.0, sentiment_threshold: 0.2 });
  } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/config', async (req, res) => {
  try {
    const { symbol, price_threshold, sentiment_threshold } = req.body;
    await db.run("INSERT INTO stock_config (symbol, price_threshold, sentiment_threshold) VALUES (?,?,?) ON CONFLICT(symbol) DO UPDATE SET price_threshold=excluded.price_threshold, sentiment_threshold=excluded.sentiment_threshold", [symbol, price_threshold, sentiment_threshold]);
    res.json({ success: true });
  } catch(e) { res.status(500).send(e.message); }
});

app.get('/api/test-alert/:symbol', async (req, res) => {
  await sendTelegramAlert(req.params.symbol, "⚠️ Test Alert Triggered");
  res.json({ success: true });
});

// =================================================================
// 7. BACKGROUND WORKER
// =================================================================
const TRACKED_ASSETS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'RELIANCE.NS', 'TCS.NS'];

const runIngestionCycle = async () => {
  for (const symbol of TRACKED_ASSETS) {
    try {
      const config = await db.get("SELECT * FROM stock_config WHERE symbol = ?", [symbol]);
      const PRICE_THRESH = config ? config.price_threshold : 2.0;
      const SENT_THRESH = config ? config.sentiment_threshold : 0.2;

      const quote = await yahooFinance.quote(symbol);
      const { regularMarketPrice: price, regularMarketVolume: volume, regularMarketChangePercent: change } = quote;
      
      await db.run("INSERT INTO market_data (symbol, price, volume) VALUES (?, ?, ?)", [symbol, price, volume]);

      const avgVolume = quote.averageDailyVolume3Month || volume;
      const rvol = volume / (avgVolume / 6.5);
      const sentimentScore = await AnalysisEngine.fetchLiveSentiment(symbol);
      let msg = "";

      if (rvol > 2.0) msg += `⚠️ **VOLUME ANOMALY**: ${rvol.toFixed(1)}x Normal\n`;
      if (Math.abs(change) >= PRICE_THRESH) {
        const icon = change > 0 ? "🚀" : "🔻";
        msg += `${icon} **PRICE MOVE**: ${change.toFixed(2)}% (Limit: ${PRICE_THRESH}%)\n`;
      }
      if (Math.abs(sentimentScore) >= SENT_THRESH) {
        const type = sentimentScore > 0 ? "Bullish" : "Bearish";
        msg += `📰 **SENTIMENT SHIFT**: ${type} (${sentimentScore.toFixed(2)})\n`;
      }

      if (msg) {
        console.log(`🚨 ALERT: ${symbol}`);
        await db.run("INSERT INTO alerts (symbol, message, severity) VALUES (?, ?, 'HIGH')", [symbol, msg]);
        await sendTelegramAlert(symbol, `${msg}\nPrice: ${price}\nConfig Used: Price>${PRICE_THRESH}%, Sent>${SENT_THRESH}`);
      }
    } catch (e) {}
  }
};
setInterval(runIngestionCycle, 60000);

// Error Handler & Shutdown
app.use((err, req, res, next) => { console.error(`🔥 Error: ${err.message}`); res.status(500).json({ error: "Server Error", details: err.message }); });
const shutdown = () => { console.log('\n🛑 Shutting down...'); db.close(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));