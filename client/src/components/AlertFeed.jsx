import React from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';

const AlertFeed = ({ signals = [] }) => {
  return (
    <aside className="col-span-12 lg:col-span-3 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 overflow-y-auto backdrop-blur-sm h-[600px] lg:h-auto">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Intelligence Feed
        </h3>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {signals.length} Events
        </span>
      </div>

      <div className="space-y-3">
        {signals.length === 0 && (
          <div className="text-center py-12 opacity-30 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
              <Activity size={48} className="relative z-10 mb-3 text-slate-400" />
            </div>
            <p className="text-sm font-medium">Scanning Market Data...</p>
            <p className="text-xs mt-1">Waiting for volume anomalies</p>
          </div>
        )}

        {signals.map((sig, i) => {
          // Determine Style based on Sentiment
          const isBullish = sig.sentiment > 0;
          const isBearish = sig.sentiment < 0;
          const borderColor = isBullish ? 'border-emerald-500/30' : isBearish ? 'border-rose-500/30' : 'border-amber-500/30';
          const glowColor = isBullish ? 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]' : isBearish ? 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]' : '';
          const accentColor = isBullish ? 'bg-emerald-500' : isBearish ? 'bg-rose-500' : 'bg-amber-500';

          return (
            <div 
              key={i} 
              className={`group p-4 rounded-xl bg-slate-950 border ${borderColor} relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${glowColor}`}
            >
              {/* Colored Side Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />
              
              {/* Header */}
              <div className="flex justify-between items-start mb-2 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">{sig.ticker}</span>
                  {isBullish && <ArrowUpRight size={14} className="text-emerald-400" />}
                  {isBearish && <ArrowDownRight size={14} className="text-rose-400" />}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">JUST NOW</span>
              </div>

              {/* Message */}
              <p className="text-xs text-slate-400 pl-3 leading-relaxed border-l border-slate-800 ml-0.5">
                {sig.msg}
              </p>

              {/* Tags */}
              <div className="mt-3 pl-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                  RVOL: {sig.rvol?.toFixed(1)}x
                </span>
                {sig.sentiment !== 0 && (
                  <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                    isBullish ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {isBullish ? 'BULLISH' : 'BEARISH'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default AlertFeed;