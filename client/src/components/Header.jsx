import React from 'react';
import { LayoutDashboard, Radio, Zap } from 'lucide-react';

const Header = () => {
  return (
    <nav className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
      <div className="flex items-center gap-3">
        {/* Logo Icon with Glow Effect */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative p-2 bg-indigo-950 rounded-lg ring-1 ring-white/10">
            <LayoutDashboard size={24} className="text-indigo-400" />
          </div>
        </div>
        
        {/* Brand Name */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
            SOLATIA FINANCE
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              Intelligent Market Sentinel
            </span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500">
          <Zap size={12} className="text-amber-500" />
          <span>LATENCY: &lt;50ms</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-mono animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <Radio size={14} />
          <span>LIVE FEED ACTIVE</span>
        </div>
      </div>
    </nav>
  );
};

export default Header;