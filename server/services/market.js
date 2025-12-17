const Alpaca = require('@alpacahq/alpaca-trade-api');
const { analyzeMarketTick } = require('../utils/analytics');
const { getSentiment } = require('./sentiment');
const Parser = require('rss-parser');

const parser = new Parser();

// Initialize Alpaca
const alpaca = new Alpaca({
  keyId: process.env.ALPACA_KEY,
  secretKey: process.env.ALPACA_SECRET,
  paper: true,
});

/**
 * Starts the Real-Time Market Stream
 * @param {Object} io - Socket.io instance to push data to frontend
 * @param {Object} supabase - DB client to save data
 * @param {Array} trackedAssets - List of stocks to watch
 */
const startMarketStream = (io, supabase, trackedAssets) => {
    const stream = alpaca.data_stream_v2;
    
    // 1. Connection Event
    stream.onConnect(() => {
        console.log("✅ Solatia Market Service: Connected to Alpaca Stream");
        
        const tickers = trackedAssets.map(t => t.ticker);
        if(tickers.length > 0) {
            console.log(`📡 Subscribing to: ${tickers.join(', ')}`);
            stream.subscribeForBars(tickers);
        }
    });

    // 2. Error Handling
    stream.onError((err) => {
        console.error("❌ Stream Error:", err);
    });

    // 3. Incoming Data Handler (1-Minute Candles)
    stream.onStockBar(async (bar) => {
        // bar structure: { Symbol, Close, Open, High, Low, Volume, Timestamp }
        
        const asset = trackedAssets.find(t => t.ticker === bar.Symbol);
        if(!asset) return;

        // --- STEP A: Run Analytics (RVOL & Z-Score) ---
        const stats = analyzeMarketTick(bar.Symbol, bar.Volume, bar.Timestamp);

        // --- STEP B: Check for Anomalies ---
        if (stats.isAnomaly) {
            console.log(`⚡ ALERT: ${bar.Symbol} Vol Spike (${stats.rvol.toFixed(1)}x)`);
            
            // Lazy Load News ONLY if anomaly detected
            let aiScore = 0;
            let newsTitle = "Market volume anomaly detected.";
            
            try {
                const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${asset.search_term}`);
                if(feed.items.length > 0) {
                    newsTitle = feed.items[0].title;
                    // Analyze sentiment of the headline
                    aiScore = await getSentiment(newsTitle);
                }
            } catch(e) { 
                console.log("⚠️ News fetch failed (non-critical)"); 
            }

            // Construct Alert Message
            const signalType = aiScore > 0.2 ? "BULLISH" : aiScore < -0.2 ? "BEARISH" : "VOLATILITY";
            const alertMsg = `${signalType}: ${stats.rvol.toFixed(1)}x Volume. ${newsTitle}`;

            // 1. Save to DB
            await supabase.from('signals').insert({
                ticker: bar.Symbol,
                type: 'ANOMALY',
                message: alertMsg,
                rvol: stats.rvol,
                sentiment_score: aiScore
            });

            // 2. Push to Frontend (Real-time Alert)
            io.emit('signal', {
                ticker: bar.Symbol,
                msg: alertMsg,
                sentiment: aiScore,
                rvol: stats.rvol,
                time: new Date()
            });
        }

        // --- STEP C: Save Candle Data (Async) ---
        // We don't await this because we want to push the tick to the UI instantly
        supabase.from('market_candles').insert({
            ticker: bar.Symbol,
            close: bar.Close,
            open: bar.Open,
            high: bar.High,
            low: bar.Low,
            volume: bar.Volume,
            time: bar.Timestamp
        }).catch(err => console.error("DB Save Error:", err.message));

        // --- STEP D: Push Tick to Frontend ---
        io.emit('tick', { 
            ticker: bar.Symbol, 
            price: bar.Close, 
            time: new Date(bar.Timestamp).getTime() / 1000 
        });
    });

    // Start the connection
    stream.connect();
};

module.exports = { startMarketStream };