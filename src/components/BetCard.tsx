import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bet } from "../types";
import { Trophy, Clock, ShieldCheck, Zap, Crown, CheckCircle2, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";

interface BetCardProps {
  bet: Bet;
  isVipUser: boolean;
  isTaken?: boolean;
  onTakeBet?: () => void;
  onUpdateResult?: (result: 'win' | 'loss' | 'pending') => void;
}

export const BetCard: React.FC<BetCardProps> = ({ bet, isVipUser, isTaken, onTakeBet, onUpdateResult }) => {
  const isLocked = bet.isVip && !isVipUser;

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg bg-card border-border ${isLocked ? 'blur-sm grayscale' : ''} ${isTaken ? 'ring-2 ring-primary border-primary/50 shadow-primary/10' : ''}`}>
      {/* Result Badge */}
      {bet.result && bet.result !== 'pending' && (
        <div className={`absolute top-0 right-0 px-4 py-1 text-[10px] font-black uppercase tracking-widest z-20 rounded-bl-xl ${bet.result === 'win' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
          {bet.result === 'win' ? 'GREEN' : 'RED'}
        </div>
      )}

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
          <div className="flex items-center gap-2">
            {bet.isVip && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
                <Crown className="w-3 h-3" /> VIP
              </Badge>
            )}
            {!isLocked && onTakeBet && (
              <Button 
                size="sm" 
                variant={isTaken ? "default" : "outline"}
                className={`h-8 gap-2 font-bold transition-all ${isTaken ? 'bg-primary hover:bg-primary/90' : 'hover:border-primary hover:text-primary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTakeBet();
                }}
              >
                {isTaken ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> PEGUEI
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> PEGAR
                  </>
                )}
              </Button>
            )}
          </div>
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

        {onUpdateResult && (
          <div className="pt-4 flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className={`flex-1 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-bold ${bet.result === 'win' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => onUpdateResult('win')}
            >
              GREEN
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className={`flex-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold ${bet.result === 'loss' ? 'bg-destructive text-destructive-foreground' : ''}`}
              onClick={() => onUpdateResult('loss')}
            >
              RED
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-muted-foreground"
              onClick={() => onUpdateResult('pending')}
            >
              LIMPAR
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
