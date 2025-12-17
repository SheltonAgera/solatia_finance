const ss = require('simple-statistics');

// In-Memory Volume Profile (Volatile Cache)
// Structure: { 'AAPL': { '09:30': [History Array], '09:31': [...] } }
let volumeProfile = {}; 

const analyzeMarketTick = (ticker, currentVolume, timestamp) => {
    const date = new Date(timestamp);
    // Create a time key (e.g., "14:30") to compare "Apples to Apples"
    const timeKey = `${date.getHours()}:${date.getMinutes()}`;

    // Initialize Profile if empty
    if (!volumeProfile[ticker]) volumeProfile[ticker] = {};
    if (!volumeProfile[ticker][timeKey]) volumeProfile[ticker][timeKey] = [];

    const history = volumeProfile[ticker][timeKey];
    
    // Learning Phase: Add current volume to history
    // Keep a rolling window of 10 days to adapt to recent market conditions
    if (history.length > 10) history.shift();
    history.push(currentVolume);

    // Warm-up period (need at least 5 data points for stats)
    if (history.length < 5) return { rvol: 1.0, zScore: 0, isAnomaly: false };

    // Math: Log-Normal Distribution logic for robust stats
    const logCurrent = Math.log(currentVolume || 1);
    const logHistory = history.map(v => Math.log(v || 1));

    const mean = ss.mean(logHistory);
    const std = ss.standardDeviation(logHistory);

    // Prevent divide by zero
    if (std === 0) return { rvol: 1.0, zScore: 0, isAnomaly: false };

    const zScore = (logCurrent - mean) / std;
    const rvol = currentVolume / Math.exp(mean);

    // TRIGGER LOGIC: 3 Sigma Event OR 300% Volume Spike
    const isAnomaly = zScore > 3 || rvol > 3.0;

    return { rvol, zScore, isAnomaly };
};

module.exports = { analyzeMarketTick };