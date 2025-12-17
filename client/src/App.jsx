import { useState, useEffect } from 'react';
import { getStockData } from './services/api';
import MarketChart from './components/MarketChart';
import { 
  Zap, Search, Activity, Clock, TrendingUp, TrendingDown, 
  Layers, AlertTriangle, CheckCircle, Target, BarChart2, 
  Settings, Save, Bell, ZapOff
} from 'lucide-react';

// --- HELPERS ---
const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined) return '---';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
};

const formatCompactNumber = (number, currency = 'USD') => {
  if (!number) return '---';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: "compact", compactDisplay: "short" }).format(number);
};

function App() {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
  const [watchlist, setWatchlist] = useState(['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'AAPL', 'TSLA', 'MSFT']);
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'overview');
  useEffect(() => localStorage.setItem('activeTab', activeTab), [activeTab]);

  const [stockData, setStockData] = useState(null);
  const [news, setNews] = useState([]);
  
  // SOLATIA SCORE STATE
  const [scores, setScores] = useState({ durability: 50, valuation: 50, momentum: 50, total: 50 });
  
  // SENTINEL & ANOMALY STATE
  const [liveScores, setLiveScores] = useState({ sentiment: 0, anomaly: 0 });
  const [alertConfig, setAlertConfig] = useState({ price_threshold: 2.0, sentiment_threshold: 0.2 });
  const [aiBrief, setAiBrief] = useState("Analyzing market data...");

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      const symbol = searchInput.toUpperCase().trim();
      if (!watchlist.includes(symbol)) setWatchlist(prev => [symbol, ...prev]);
      setActiveSymbol(symbol);
      setSearchInput('');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // 1. Stock Data & Solatia Score
      try {
        const data = await getStockData(activeSymbol);
        if (data) {
          setStockData(data);
          
          const pe = data.details.peRatio || 25;
          const roe = data.details.roe || 0.15; 
          const debt = data.details.debtToEquity || 50; 
          const rsi = data.details.rsi || 50; 

          let valScore = 100 - (pe * 1.5);
          if (valScore < 10) valScore = 10; else if (valScore > 95) valScore = 95;
          
          let durScore = (roe * 100) + (100 - (debt * 0.5));
          if (durScore > 95) durScore = 95; else if (durScore < 20) durScore = 20;
          
          setScores({
            valuation: valScore.toFixed(0),
            durability: durScore.toFixed(0),
            momentum: rsi.toFixed(0),
            total: ((valScore + durScore + rsi) / 3).toFixed(0)
          });

          const trend = data.change >= 0 ? "bullish" : "bearish";
          const valText = pe > 35 ? "premium" : "fair";
          setAiBrief(`${data.symbol} is trading ${trend} (${formatCurrency(data.price, data.currency)}). Fundamentals suggest a ${valText} valuation (P/E: ${pe?.toFixed(1)}x). Technicals show RSI at ${rsi?.toFixed(1)}.`);
        }
      } catch (e) { console.error("Stock error", e); }

      // 2. News
      try {
        const res = await fetch(`http://localhost:5000/api/news?symbol=${activeSymbol}`);
        const newsData = await res.json();
        setNews(newsData.slice(0, 10));
      } catch (e) { console.error("News error", e); }

      // 3. Live Scores (Sentiment + Anomaly)
      try {
        const res = await fetch(`http://localhost:5000/api/scores/${activeSymbol}`);
        const data = await res.json();
        setLiveScores(data);
      } catch (e) { console.error("Live Score error", e); }

      // 4. Alert Config
      try {
        const res = await fetch(`http://localhost:5000/api/config/${activeSymbol}`);
        const data = await res.json();
        setAlertConfig(data);
      } catch (e) { console.error("Config error", e); }
    };

    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [activeSymbol]);

  const saveAlertConfig = async () => {
    try {
      await fetch('http://localhost:5000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, ...alertConfig })
      });
      alert(`Sentinel alerts updated for ${activeSymbol}`);
    } catch (e) { alert("Failed to save"); }
  };

  const WatchlistItem = ({ symbol, isActive, onClick }) => (
    <div onClick={onClick} className={`flex justify-between items-center p-3 cursor-pointer border-b border-[#27272a] hover:bg-[#27272a] transition-colors ${isActive ? 'bg-[#27272a] border-l-2 border-l-blue-500' : 'bg-transparent border-l-2 border-l-transparent'}`}>
      <div><span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>{symbol}</span></div>
    </div>
  );

  const StatBox = ({ label, value, color = "text-white" }) => (
    <div className="flex justify-between items-center py-2 border-b border-[#27272a] last:border-0">
      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      <span className={`text-xs font-mono ${color}`}>{value}</span>
    </div>
  );

  const ScoreBar = ({ label, value, color }) => (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-white font-mono">{value}/100</span>
      </div>
      <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#000000] text-gray-300 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-[#27272a] flex flex-col bg-[#09090b]">
        <div className="p-4 border-b border-[#27272a]">
           <h1 className="flex items-center gap-2 text-sm font-bold text-gray-100 tracking-wide">
             <Zap size={14} className="text-blue-500 fill-blue-500" /> SOLATIA <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1 rounded">PRO</span>
           </h1>
        </div>
        
        <div className="p-2 border-b border-[#27272a]">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search (Press Enter)..." 
              className="w-full bg-[#18181b] border border-[#27272a] text-xs text-white pl-8 py-2 rounded focus:border-blue-500 outline-none placeholder-gray-600 transition"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {watchlist.map(sym => <WatchlistItem key={sym} symbol={sym} isActive={activeSymbol === sym} onClick={() => setActiveSymbol(sym)} />)}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#000000]">
        <header className="h-14 border-b border-[#27272a] flex items-center px-6 justify-between bg-[#09090b]">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-white tracking-tight">{activeSymbol}</h2>
             {stockData ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono text-white">
                    {formatCurrency(stockData.price, stockData.currency)}
                  </span>
                  <span className={`text-xs font-mono flex items-center ${stockData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stockData.change >= 0 ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                    {stockData.change.toFixed(2)}%
                  </span>
                </div>
             ) : <span className="text-xs text-gray-500 animate-pulse">Loading...</span>}
          </div>
          <div className="flex gap-1 bg-[#18181b] p-1 rounded border border-[#27272a]">
            {['overview', 'fundamentals', 'news', 'settings'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-3 py-1 text-[11px] font-medium rounded capitalize transition ${
                  activeTab === tab 
                    ? 'bg-[#27272a] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'settings' ? 'Sentinel' : tab}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 p-1 overflow-y-auto custom-scrollbar">
          
          {/* --- TAB: OVERVIEW --- */}
          {activeTab === 'overview' && (
            <div className="h-full flex flex-col gap-1">
               <div className="px-2 pt-2">
                 <div className="bg-[#111] border border-red-900/30 rounded p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                       <AlertTriangle size={12} /> LIVE ANOMALY DETECTOR
                    </div>
                    <div className="text-[10px] text-gray-500 hidden sm:block">Active Scan: Volume Spikes & Sentiment Shifts</div>
                    <button 
                      onClick={() => fetch(`http://localhost:5000/api/test-alert/${activeSymbol}`)}
                      className="text-[10px] bg-red-900/20 text-red-400 border border-red-900/50 px-2 py-0.5 rounded hover:bg-red-900/40 transition"
                    >
                      Test Alert
                    </button>
                 </div>
               </div>

               <div className="flex-1 p-2 bg-[#000000]"><MarketChart symbol={activeSymbol} currency={stockData?.currency} /></div>
               
               <div className="h-40 border-t border-[#27272a] bg-[#09090b] p-4 grid grid-cols-3 gap-6">
                  <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Key Stats</h4>
                      <StatBox label="Market Cap" value={formatCompactNumber(stockData?.details?.marketCap, stockData?.currency)} />
                      <StatBox label="Beta" value={stockData?.details?.beta?.toFixed(2) || '---'} />
                      <StatBox label="Div Yield" value={stockData?.details?.dividendYield ? `${(stockData.details.dividendYield * 100).toFixed(2)}%` : '---'} />
                  </div>
                  <div className="col-span-2 border border-[#27272a] rounded bg-[#000000] p-3">
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center gap-2"><Layers size={12}/> AI Executive Brief</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{aiBrief}</p>
                  </div>
               </div>
            </div>
          )}

          {/* --- TAB: SENTINEL SETTINGS --- */}
          {activeTab === 'settings' && (
             <div className="p-8 max-w-3xl mx-auto">
                {/* 1. LIVE SENTIMENT GAUGE (Detailed) */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 mb-8 flex items-center justify-between">
                   <div>
                      <h3 className="text-sm font-bold text-white mb-1">Live Sentiment Analysis</h3>
                      <p className="text-[11px] text-gray-500">Mean score calculated from last 10 news articles.</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                         <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                              fill="none" 
                              stroke={liveScores.sentiment > 0 ? '#22c55e' : '#ef4444'} 
                              strokeWidth="3" 
                              strokeDasharray={`${((liveScores.sentiment + 1) * 50)}, 100`} 
                            />
                         </svg>
                         <span className={`absolute text-xs font-bold ${liveScores.sentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {liveScores.sentiment.toFixed(2)}
                         </span>
                      </div>
                      <div className="text-right">
                         <div className="text-xs font-bold text-white">{liveScores.sentiment > 0 ? 'Bullish' : 'Bearish'}</div>
                         <div className="text-[10px] text-gray-500">Real-time update</div>
                      </div>
                   </div>
                </div>

                {/* 2. CONFIGURATION FORM */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8">
                   <div className="flex items-center gap-2 mb-6 text-white font-bold text-sm uppercase tracking-wide">
                      <Settings size={16} className="text-purple-400"/> Alert Settings for <span className="text-blue-400">{activeSymbol}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-8 mb-8">
                      <div>
                         <div className="flex justify-between mb-2">
                            <label className="text-xs text-gray-400">Price Move Threshold (%)</label>
                            <span className="text-white font-mono text-xs">{alertConfig.price_threshold}%</span>
                         </div>
                         <input type="number" step="0.5" value={alertConfig.price_threshold} onChange={e => setAlertConfig({...alertConfig, price_threshold: parseFloat(e.target.value)})} className="w-full bg-[#18181b] border border-[#333] text-white p-2 rounded text-sm outline-none" />
                      </div>
                      <div>
                         <div className="flex justify-between mb-2">
                            <label className="text-xs text-gray-400">Sentiment Threshold (Abs)</label>
                            <span className="text-white font-mono text-xs">{alertConfig.sentiment_threshold}</span>
                         </div>
                         <input type="number" step="0.05" max="1" min="0" value={alertConfig.sentiment_threshold} onChange={e => setAlertConfig({...alertConfig, sentiment_threshold: parseFloat(e.target.value)})} className="w-full bg-[#18181b] border border-[#333] text-white p-2 rounded text-sm outline-none" />
                      </div>
                   </div>
                   <button onClick={saveAlertConfig} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-2 transition text-sm shadow-lg"><Save size={14}/> Save Alert Settings</button>
                </div>
             </div>
          )}

          {/* --- TAB: FUNDAMENTALS & NEWS (Standard) --- */}
          {activeTab === 'fundamentals' && (
             <div className="p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#27272a] pb-2">Financial Ratios</h3>
                <div className="grid grid-cols-3 gap-8">
                   <div className="bg-[#09090b] border border-[#27272a] rounded p-4">
                      <h4 className="text-xs text-blue-400 font-bold mb-3 uppercase">Valuation</h4>
                      <StatBox label="P/E Ratio" value={stockData?.details?.peRatio?.toFixed(2) || '--'} />
                      <StatBox label="PEG Ratio" value={stockData?.details?.pegRatio?.toFixed(2) || '--'} />
                      <StatBox label="Price/Book" value={stockData?.details?.priceToBook?.toFixed(2) || '--'} />
                   </div>
                   <div className="bg-[#09090b] border border-[#27272a] rounded p-4">
                      <h4 className="text-xs text-green-400 font-bold mb-3 uppercase">Profitability</h4>
                      <StatBox label="ROE" value={stockData?.details?.roe ? `${(stockData.details.roe * 100).toFixed(1)}%` : '--'} />
                      <StatBox label="Profit Margin" value={stockData?.details?.profitMargin ? `${(stockData.details.profitMargin * 100).toFixed(1)}%` : '--'} />
                      <StatBox label="Operating Margin" value={stockData?.details?.operatingMargin ? `${(stockData.details.operatingMargin * 100).toFixed(1)}%` : '--'} />
                   </div>
                   <div className="bg-[#09090b] border border-[#27272a] rounded p-4">
                      <h4 className="text-xs text-yellow-400 font-bold mb-3 uppercase">Health</h4>
                      <StatBox label="Debt/Equity" value={stockData?.details?.debtToEquity?.toFixed(1) + '%' || '--'} />
                      <StatBox label="Current Ratio" value={stockData?.details?.currentRatio?.toFixed(2) || '--'} />
                      <StatBox label="Beta (Vol)" value={stockData?.details?.beta?.toFixed(2) || '--'} />
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'news' && (
            <div className="p-4 grid grid-cols-1 gap-2">
               {news.map((n, i) => (
                 <div key={i} className={`flex gap-4 p-4 border rounded hover:border-gray-600 transition group border-[#27272a] bg-[#09090b]`}>
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] font-bold ${n.sentiment?.label === 'Bullish' ? 'text-green-400' : 'text-red-400'}`}>{n.sentiment?.label} ({n.sentiment?.confidence}%)</span>
                          <span className={`text-[10px] font-bold border border-gray-800 px-1 rounded ${n.context?.relevance === 'Direct' ? 'text-blue-400' : 'text-gray-500'}`}>{n.context?.relevance}</span>
                          <span className="text-[10px] text-gray-500">{n.source.name}</span>
                       </div>
                       <a href={n.url} target="_blank" rel="noreferrer" className="block"><h3 className="text-sm font-semibold text-gray-200 group-hover:text-blue-400 mb-1">{n.title}</h3><p className="text-xs text-gray-500 line-clamp-2">{n.description}</p></a>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </main>

      {/* --- RIGHT SIDEBAR (Updated with Sentinel) --- */}
      <aside className="w-80 border-l border-[#27272a] bg-[#09090b] flex flex-col overflow-y-auto">
         
         {/* 1. SOLATIA COMPOSITE */}
         <div className="p-6 border-b border-[#27272a]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} /> Solatia Score</h3>
            <div className="flex items-center gap-4 mb-6">
               <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scores.total > 60 ? '#22c55e' : '#fbbf24'} strokeWidth="3" strokeDasharray={`${scores.total}, 100`} />
                  </svg>
                  <span className="absolute text-lg font-bold text-white">{scores.total}</span>
               </div>
               <div><div className="text-sm font-bold text-white">Composite</div><div className="text-[10px] text-gray-500">Quality, Value, Trend</div></div>
            </div>
            <ScoreBar label="Quality" value={scores.durability} color="#3b82f6" />
            <ScoreBar label="Value" value={scores.valuation} color="#22c55e" />
            <ScoreBar label="Trend" value={scores.momentum} color="#f59e0b" />
         </div>

         {/* 2. SENTINEL GAUGE (New) */}
         <div className="p-6 border-b border-[#27272a]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Bell size={14} /> Live Sentinel</h3>
            
            {/* Live Sentiment Gauge */}
            <div className="mb-6">
                <div className="flex justify-between text-[10px] text-gray-400 mb-2">
                    <span>Market Sentiment</span>
                    <span className={liveScores.sentiment > 0 ? "text-green-400" : "text-red-400"}>
                        {liveScores.sentiment > 0 ? "Bullish" : "Bearish"} ({liveScores.sentiment.toFixed(2)})
                    </span>
                </div>
                <div className="h-2 bg-[#27272a] rounded-full overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-500 left-1/2"></div>
                    <div 
                        className={`h-full transition-all duration-1000 ${liveScores.sentiment > 0 ? "bg-green-500" : "bg-red-500"}`} 
                        style={{ 
                            width: `${Math.abs(liveScores.sentiment) * 50}%`,
                            marginLeft: liveScores.sentiment > 0 ? '50%' : `${50 - (Math.abs(liveScores.sentiment) * 50)}%`
                        }}
                    ></div>
                </div>
            </div>

            {/* Anomaly Measurement */}
            <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Anomaly Measurement</span>
                    <span className={liveScores.anomaly > 50 ? "text-red-500 font-bold" : "text-gray-400"}>{liveScores.anomaly}/100</span>
                </div>
                <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${liveScores.anomaly > 50 ? "bg-red-500 animate-pulse" : "bg-blue-500"}`} style={{ width: `${liveScores.anomaly}%` }}></div>
                </div>
                <p className="text-[9px] text-gray-600 mt-1">Based on Vol/Price spikes vs 30d avg.</p>
            </div>
         </div>

         <div className="p-6">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Analysis Notes</h3>
             <ul className="space-y-3 text-xs text-gray-300">
                <li className="flex gap-2"><CheckCircle size={14} className="text-green-500 shrink-0" /> Strong ROE suggests high efficiency.</li>
                {scores.valuation < 40 && <li className="flex gap-2"><AlertTriangle size={14} className="text-red-500 shrink-0" /> Stock appears overvalued vs peers.</li>}
             </ul>
         </div>
      </aside>
    </div>
  );
}

export default App;