import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PerformanceData } from '../types';

interface PerformanceChartProps {
  data: PerformanceData[];
  color: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, color }) => {
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

  return (
    <div className="h-full w-full min-h-[100px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={chartData}>
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
