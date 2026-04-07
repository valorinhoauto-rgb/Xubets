import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bet } from "../types";
import { Trophy, Clock, ShieldCheck, Zap, Crown, CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";

interface BetCardProps {
  bet: Bet;
  isVipUser: boolean;
  isTaken?: boolean;
  isChecking?: boolean;
  isHistory?: boolean;
  onTakeBet?: () => void;
  onUpdateResult?: (result: 'win' | 'loss' | 'pending') => void;
  onAiCheck?: () => void;
  onDelete?: () => void;
  onSubscribe?: () => void;
}

export const BetCard: React.FC<BetCardProps> = ({ 
  bet, 
  isVipUser, 
  isTaken, 
  isChecking, 
  isHistory,
  onTakeBet, 
  onUpdateResult, 
  onAiCheck, 
  onDelete,
  onSubscribe 
}) => {
  const isLocked = bet.isVip && !isVipUser;

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg bg-card border-border md:rounded-3xl rounded-none border-x-0 md:border-x ${isTaken ? 'ring-2 ring-primary border-primary/50 shadow-primary/10' : ''}`}>
      {/* Result Badge */}
      {bet.result && bet.result !== 'pending' && (
        <div className={`absolute top-0 right-0 px-4 py-1 text-[10px] font-black uppercase tracking-widest z-20 rounded-bl-xl ${bet.result === 'win' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'}`}>
          {bet.result === 'win' ? 'GREEN' : 'RED'}
        </div>
      )}

      {isLocked && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] group">
          <div className="bg-card/90 p-6 rounded-2xl border border-yellow-500/30 shadow-2xl flex flex-col items-center text-center max-w-[80%] animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-10 h-10 text-yellow-500 animate-bounce" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-2">CONTEÚDO VIP</h3>
            <p className="text-sm text-muted-foreground mb-6">Esta análise e palpite são exclusivos para membros VIP. Junte-se ao time agora!</p>
            <Button 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl gap-2"
              onClick={onSubscribe}
            >
              <Zap className="w-4 h-4 fill-current" />
              QUERO SER VIP
            </Button>
          </div>
        </div>
      )}
      
      <CardHeader className="p-4 md:pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2 leading-tight">
              {bet.type === 'single' && <ShieldCheck className="text-primary w-5 h-5 shrink-0" />}
              {bet.type === 'multi' && <Zap className="text-blue-400 w-5 h-5 shrink-0" />}
              {bet.type === 'bingo' && <Trophy className="text-yellow-500 w-5 h-5 shrink-0" />}
              <span className="line-clamp-2">{bet.title}</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm font-medium text-muted-foreground">
              Odd Total: <span className={`text-primary font-bold ${isLocked ? 'blur-md select-none' : ''}`}>{bet.odds.toFixed(2)}</span>
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {bet.isVip && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1 px-2 py-0 h-6 text-[10px]">
                <Crown className="w-3 h-3" /> VIP
              </Badge>
            )}
            <div className="flex gap-2">
              {onDelete && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 md:h-8 w-7 md:w-8 p-0 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              )}
              {!isLocked && onTakeBet && (
                <Button 
                  size="sm" 
                  variant={isTaken ? "default" : "outline"}
                  className={`h-7 md:h-8 px-2 md:px-3 gap-1 md:gap-2 text-[10px] md:text-xs font-bold transition-all ${isTaken ? 'bg-primary hover:bg-primary/90' : 'hover:border-primary hover:text-primary'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTakeBet();
                  }}
                >
                  {isTaken ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden xs:inline">PEGUEI</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden xs:inline">PEGAR</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 md:p-6 md:pt-0 space-y-4">
        <div className="space-y-2 md:space-y-3">
          {bet.matches.map((match, idx) => (
            <div key={idx} className="bg-accent/50 p-2 md:p-3 rounded-lg border border-border/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate max-w-[60%]">{match.league}</span>
                <span className="text-[9px] md:text-[10px] flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" /> {match.time}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="font-semibold text-[11px] md:text-sm truncate flex-1 min-w-0">
                  {match.homeTeam} <span className="text-muted-foreground px-0.5 font-normal">vs</span> {match.awayTeam}
                </div>
                <Badge variant="outline" className={`font-mono text-[9px] md:text-xs border-primary/20 text-primary shrink-0 px-1.5 py-0 h-5 md:h-6 ${isLocked ? 'blur-md select-none' : ''}`}>
                  {isLocked ? 'PALPITE VIP' : `${match.prediction} @ ${match.odds.toFixed(2)}`}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {!isHistory && (
          <>
            <Separator className="bg-border" />
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Análise do Especialista</h4>
              <div className={`text-sm text-foreground/90 leading-relaxed ${isLocked ? 'blur-md select-none' : ''}`}>
                {isLocked ? (
                  <p>Esta é uma análise detalhada feita pela nossa IA para garantir a melhor probabilidade de acerto. Assine o VIP para ler o conteúdo completo e entender a estratégia por trás deste palpite.</p>
                ) : (
                  <ReactMarkdown>{bet.analysis}</ReactMarkdown>
                )}
              </div>
            </div>
          </>
        )}

        {onUpdateResult && (
          <div className="pt-4 space-y-2">
            <div className="flex gap-2">
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
            {onAiCheck && bet.result === 'pending' && (
              <Button 
                size="sm" 
                variant="secondary" 
                className="w-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 font-bold gap-2"
                onClick={onAiCheck}
                disabled={isChecking}
              >
                <Zap className={`w-4 h-4 ${isChecking ? 'animate-pulse' : ''}`} />
                {isChecking ? 'VERIFICANDO...' : 'VERIFICAR RESULTADO (IA)'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
