import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bet, PerformanceData } from '../types';
import { PerformanceChart } from './PerformanceChart';
import { TrendingUp, TrendingDown, Target, Zap, ShieldCheck, Trophy } from 'lucide-react';

interface PersonalPerformanceProps {
  bets: Bet[];
  userBets: string[];
}

export const PersonalPerformance: React.FC<PersonalPerformanceProps> = ({ bets, userBets }) => {
  const myTakenBets = bets.filter(b => userBets.includes(b.id));
  const settledBets = myTakenBets.filter(b => b.result !== 'pending');

  const statsByType = (type: 'single' | 'multi' | 'bingo') => {
    const typeBets = settledBets.filter(b => b.type === type);
    const wins = typeBets.filter(b => b.result === 'win').length;
    const losses = typeBets.filter(b => b.result === 'loss').length;
    const total = typeBets.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const units = typeBets.reduce((acc, b) => acc + (b.result === 'win' ? (b.odds - 1) : -1), 0);
    
    // Generate chart data for this type
    const chartData = typeBets
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce((acc: PerformanceData[], b) => {
        const unit = b.result === 'win' ? (b.odds - 1) : -1;
        const lastUnits = acc.length > 0 ? acc[acc.length - 1].units : 0;
        acc.push({
          date: new Date(b.date).toLocaleDateString(),
          units: lastUnits + unit,
          type: b.type
        });
        return acc;
      }, []);

    return { wins, losses, total, winRate, units, chartData };
  };

  const singleStats = statsByType('single');
  const multiStats = statsByType('multi');
  const bingoStats = statsByType('bingo');

  const totalUnits = settledBets.reduce((acc, b) => acc + (b.result === 'win' ? (b.odds - 1) : -1), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest font-bold text-[10px]">Sistema Individual</CardDescription>
            <CardTitle className="text-3xl font-black">{singleStats.units.toFixed(1)}u</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate: {singleStats.winRate.toFixed(1)}%</span>
              <span className="font-bold text-primary">{singleStats.wins}W - {singleStats.losses}L</span>
            </div>
            <div className="mt-4">
              <PerformanceChart data={singleStats.chartData} color="#3b82f6" height={96} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest font-bold text-[10px]">Sistema Múltipla</CardDescription>
            <CardTitle className="text-3xl font-black">{multiStats.units.toFixed(1)}u</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate: {multiStats.winRate.toFixed(1)}%</span>
              <span className="font-bold text-primary">{multiStats.wins}W - {multiStats.losses}L</span>
            </div>
            <div className="mt-4">
              <PerformanceChart data={multiStats.chartData} color="#3b82f6" height={96} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trophy className="w-16 h-16 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest font-bold text-[10px]">Sistema Bingo</CardDescription>
            <CardTitle className="text-3xl font-black">{bingoStats.units.toFixed(1)}u</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate: {bingoStats.winRate.toFixed(1)}%</span>
              <span className="font-bold text-primary">{bingoStats.wins}W - {bingoStats.losses}L</span>
            </div>
            <div className="mt-4">
              <PerformanceChart data={bingoStats.chartData} color="#3b82f6" height={96} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl font-black">Resumo de Atividade</CardTitle>
              <CardDescription className="text-xs md:text-sm">Acompanhe seu progresso em todas as apostas que você seguiu.</CardDescription>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Lucro Total</span>
              <div className="flex items-center gap-2 justify-start md:justify-end">
                <span className={`text-2xl md:text-3xl font-black ${totalUnits >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {totalUnits > 0 ? '+' : ''}{totalUnits.toFixed(1)}u
                </span>
                {totalUnits >= 0 ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-primary" /> : <TrendingDown className="w-5 h-5 md:w-6 md:h-6 text-destructive" />}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="hidden md:grid grid-cols-4 text-[10px] uppercase tracking-widest font-black text-muted-foreground pb-2 border-b border-border">
              <span>Data</span>
              <span>Título</span>
              <span>Tipo</span>
              <span className="text-right">Resultado</span>
            </div>
            {settledBets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(bet => (
              <div key={bet.id} className="flex flex-col md:grid md:grid-cols-4 items-start md:items-center py-3 md:py-2 border-b border-border/30 last:border-0 gap-2 md:gap-0">
                <div className="flex justify-between w-full md:contents">
                  <span className="text-[10px] md:text-xs font-medium text-muted-foreground md:text-foreground">{new Date(bet.date).toLocaleDateString()}</span>
                  <span className="md:hidden text-[10px] uppercase font-black px-2 py-0.5 rounded bg-accent text-muted-foreground">{bet.type}</span>
                </div>
                <span className="text-sm font-bold truncate w-full">{bet.title}</span>
                <span className="hidden md:inline text-xs uppercase font-bold text-muted-foreground">{bet.type}</span>
                <div className="flex justify-between items-center w-full md:contents">
                  <span className="md:hidden text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Resultado:</span>
                  <div className="text-right">
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${bet.result === 'win' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {bet.result === 'win' ? `+${(bet.odds - 1).toFixed(1)}u` : '-1.0u'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {settledBets.length === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-sm italic">Você ainda não finalizou nenhuma aposta que seguiu.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
