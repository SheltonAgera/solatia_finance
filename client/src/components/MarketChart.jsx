import React, { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';

// SMA Calculator
const calculateSMA = (data, window) => {
  if (!data || data.length < window) return [];
  let smaData = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) { 
        smaData.push({ x: data[i].x, y: null }); 
        continue; 
    }
    const slice = data.slice(i - window + 1, i + 1);
    const validPoints = slice.filter(p => p.y && p.y[3] !== null);
    
    if (validPoints.length === 0) {
       smaData.push({ x: data[i].x, y: null });
       continue;
    }
    const sum = validPoints.reduce((acc, curr) => acc + curr.y[3], 0);
    smaData.push({ x: data[i].x, y: sum / window });
  }
  return smaData;
};

// --- HELPER: FORMAT CURRENCY FOR CHART AXIS ---
const formatAxisCurrency = (val, currencyCode = 'USD') => {
   if (typeof val === 'undefined' || val === null) return '';
   return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: "compact" // Shows 2k instead of 2000 for cleaner axis
   }).format(val);
};

const MarketChart = ({ symbol, currency = 'USD' }) => {
  const [series, setSeries] = useState([]);
  const [timeframe, setTimeframe] = useState('1y'); 
  
  const timeframes = [
    { label: '1D', value: '1d' }, { label: '1W', value: '1w' }, { label: '1M', value: '1m' },
    { label: 'YTD', value: 'ytd' }, { label: '1Y', value: '1y' }, { label: '5Y', value: '5y' }
  ];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/market-data/${symbol}?range=${timeframe}`);
        const rawData = await res.json();
        if (!rawData || rawData.length === 0) return;

        const isIntraday = timeframe === '1d' || timeframe === '1w';

        const candleData = rawData.map(d => {
            const dateObj = new Date(d.x);
            const label = isIntraday 
              ? dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
              : dateObj.toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: timeframe === '5y' ? '2-digit' : undefined });
              
            return { x: label, y: d.y };
        });

        setSeries([
          { name: 'Price', type: 'candlestick', data: candleData },
          { name: 'SMA 50', type: 'line', data: calculateSMA(candleData, 50) },
          { name: 'SMA 200', type: 'line', data: calculateSMA(candleData, 200) }
        ]);
      } catch (err) { console.error("Chart error:", err); }
    };
    fetchHistory();
  }, [symbol, timeframe]);

  const options = useMemo(() => ({
    chart: { type: 'candlestick', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
    theme: { mode: 'dark' },
    grid: { borderColor: '#27272a', xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
    xaxis: { type: 'category', tickAmount: 6, labels: { style: { colors: '#71717a', fontSize: '11px', fontFamily: 'monospace' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { 
      labels: { 
        style: { colors: '#71717a', fontFamily: 'monospace', fontSize: '11px' }, 
        // USE DYNAMIC CURRENCY FORMATTER
        formatter: (value) => formatAxisCurrency(value, currency)
      }, 
      forceNiceScale: true, 
      opposite: true 
    },
    stroke: { width: [1, 1.5, 1.5], curve: 'straight' },
    colors: ['#22c55e', '#fbbf24', '#8b5cf6'],
    plotOptions: { candlestick: { colors: { upward: '#22c55e', downward: '#ef4444' }, wick: { useFillColor: true } } },
    legend: { show: false },
    tooltip: { 
      theme: 'dark', 
      x: { show: true },
      y: {
        // Tooltip should also show currency
        formatter: (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val)
      }
    }
  }), [timeframe, currency]);

  return (
    <div className="flex flex-col h-full w-full bg-[#09090b] border border-[#27272a] rounded-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] bg-[#09090b]">
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button key={tf.value} onClick={() => setTimeframe(tf.value)} className={`px-2 py-0.5 text-[10px] font-medium rounded hover:bg-[#27272a] transition ${timeframe === tf.value ? 'text-blue-400 bg-[#27272a]' : 'text-gray-500'}`}>{tf.label}</button>
          ))}
        </div>
        <div className="flex gap-3 text-[10px] font-mono text-gray-500">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></div>SMA 50</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></div>SMA 200</span>
        </div>
      </div>
      <div className="flex-1 min-h-0"><Chart options={options} series={series} type="candlestick" width="100%" height="100%" /></div>
    </div>
  );
};

export default MarketChart;