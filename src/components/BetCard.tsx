import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bet } from "../types";
import { Trophy, Clock, ShieldCheck, Zap, Crown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BetCardProps {
  bet: Bet;
  isVipUser: boolean;
}

export const BetCard: React.FC<BetCardProps> = ({ bet, isVipUser }) => {
  const isLocked = bet.isVip && !isVipUser;

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg bg-card border-border ${isLocked ? 'blur-sm grayscale' : ''}`}>
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
          <Crown className="w-12 h-12 text-yellow-400 mb-4 animate-pulse" />
          <p className="text-white font-bold text-lg">Conteúdo VIP</p>
          <p className="text-white/80 text-sm">Assine para desbloquear</p>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {bet.type === 'single' && <ShieldCheck className="text-primary" />}
              {bet.type === 'multi' && <Zap className="text-blue-400" />}
              {bet.type === 'bingo' && <Trophy className="text-yellow-500" />}
              {bet.title}
            </CardTitle>
            <CardDescription className="text-sm font-medium text-muted-foreground">
              Odd Total: <span className="text-primary font-bold">{bet.odds.toFixed(2)}</span>
            </CardDescription>
          </div>
          {bet.isVip && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
              <Crown className="w-3 h-3" /> VIP
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {bet.matches.map((match, idx) => (
            <div key={idx} className="bg-accent/50 p-3 rounded-lg border border-border/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{match.league}</span>
                <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" /> {match.time}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="font-semibold text-sm">
                  {match.homeTeam} <span className="text-muted-foreground px-1">vs</span> {match.awayTeam}
                </div>
                <Badge variant="outline" className="font-mono text-xs border-primary/20 text-primary">
                  {match.prediction} @ {match.odds.toFixed(2)}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-border" />

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Análise do Especialista</h4>
          <div className="text-sm text-foreground/90 leading-relaxed">
            <ReactMarkdown>{bet.analysis}</ReactMarkdown>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
