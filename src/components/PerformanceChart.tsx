import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PerformanceData } from '../types';

interface PerformanceChartProps {
  data: PerformanceData[];
  color: string;
  height?: number | string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, color, height = 200 }) => {
  // Calculate cumulative units
  let cumulative = 0;
  const chartData = data.map(d => {
    cumulative += d.units;
    // Format YYYY-MM-DD to DD/MM for display
    const displayDate = d.date.includes('-') 
      ? d.date.split('-').slice(1).reverse().join('/') 
      : d.date;
      
    return {
      date: displayDate,
      units: cumulative
    };
  });

  if (data.length === 0) {
    return (
      <div style={{ width: '100%', height: height }} className="flex items-center justify-center border border-dashed border-border/30 rounded-xl">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Sem dados</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height={height as any} minWidth={0} minHeight={0}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1a1a1a', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            itemStyle={{ color: color }}
          />
          <Area 
            type="monotone" 
            dataKey="units" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorUnits)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
