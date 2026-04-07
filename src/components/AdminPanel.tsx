import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, Save, RefreshCw, ShieldCheck, Image as ImageIcon, Loader2, Key, Crown } from 'lucide-react';
import { Bet, Match } from '../types';
import { motion } from 'framer-motion';
import { interpretBetScreenshot } from '../services/gemini';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface AdminPanelProps {
  onAddBet: (bet: Bet) => void;
  onForceGenerate: () => void;
  onClearDatabase: () => void;
  onClearBets: () => void;
  onApproveVip: (uid: string) => void;
  pendingUsers: any[];
  onShowStatus: (message: string, type: 'success' | 'error' | 'info') => void;
  isGenerating: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onAddBet, 
  onForceGenerate, 
  onClearDatabase, 
  onClearBets, 
  onApproveVip,
  pendingUsers,
  onShowStatus, 
  isGenerating 
}) => {
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearBetsConfirm, setShowClearBetsConfirm] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const [newBet, setNewBet] = useState<Partial<Bet>>({
    type: 'single',
    title: '',
    description: '',
    odds: 1.5,
    analysis: '',
    isVip: false,
    matches: []
  });

  const [newMatch, setNewMatch] = useState<Match>({
    homeTeam: '',
    awayTeam: '',
    league: '',
    prediction: '',
    odds: 1.5,
    time: ''
  });

  const handleAddMatch = () => {
    if (newMatch.homeTeam && newMatch.awayTeam) {
      setNewBet(prev => ({
        ...prev,
        matches: [...(prev.matches || []), newMatch]
      }));
      setNewMatch({
        homeTeam: '',
        awayTeam: '',
        league: '',
        prediction: '',
        odds: 1.5,
        time: ''
      });
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          setIsInterpreting(true);
          try {
            const interpreted = await interpretBetScreenshot(base64);
            if (interpreted) {
              setNewBet(prev => ({
                ...prev,
                ...interpreted,
                matches: interpreted.matches || prev.matches
              }));
              onShowStatus("Print interpretada com sucesso!", "success");
            } else {
              onShowStatus("Não foi possível interpretar esta imagem. Tente uma print mais clara.", "error");
            }
          } catch (err) {
            console.error(err);
            onShowStatus("Erro ao processar imagem.", "error");
          } finally {
            setIsInterpreting(false);
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleRemoveMatch = (index: number) => {
    setNewBet(prev => ({
      ...prev,
      matches: prev.matches?.filter((_, i) => i !== index)
    }));
  };

  const handleSaveBet = () => {
    if (newBet.title && newBet.matches && newBet.matches.length > 0) {
      onAddBet({
        ...newBet,
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        result: 'pending',
        isManual: true
      } as Bet);
      setNewBet({
        type: 'single',
        title: '',
        description: '',
        odds: 1.5,
        analysis: '',
        isVip: false,
        matches: []
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Painel Administrativo</h2>
          <p className="text-sm text-muted-foreground">Gerencie palpites e automação de IA.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {!hasApiKey && (
            <Button 
              onClick={handleOpenKeyDialog}
              variant="destructive"
              className="flex-1 md:flex-none gap-2 animate-pulse text-xs h-9"
            >
              <Key className="w-4 h-4" />
              Configurar Chave API
            </Button>
          )}
          <Button 
            onClick={onForceGenerate} 
            disabled={isGenerating}
            className="flex-1 md:flex-none bg-primary hover:bg-primary/90 gap-2 text-xs h-9"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Gerando...' : 'Forçar IA'}
          </Button>
          <Button 
            onClick={() => {
              if (showClearBetsConfirm) {
                onClearBets();
                setShowClearBetsConfirm(false);
              } else {
                setShowClearBetsConfirm(true);
                setTimeout(() => setShowClearBetsConfirm(false), 3000);
              }
            }} 
            variant={showClearBetsConfirm ? "destructive" : "outline"}
            disabled={isGenerating}
            className={`flex-1 md:flex-none gap-2 transition-all duration-300 text-xs h-9 ${showClearBetsConfirm ? 'scale-105 ring-2 ring-destructive ring-offset-2' : ''}`}
          >
            <Trash2 className="w-4 h-4" />
            {showClearBetsConfirm ? 'CONFIRMAR' : 'Limpar Apostas'}
          </Button>
          <Button 
            onClick={() => {
              if (showClearConfirm) {
                onClearDatabase();
                setShowClearConfirm(false);
              } else {
                setShowClearConfirm(true);
                setTimeout(() => setShowClearConfirm(false), 3000);
              }
            }} 
            variant={showClearConfirm ? "destructive" : "outline"}
            disabled={isGenerating}
            className={`flex-1 md:flex-none gap-2 transition-all duration-300 text-xs h-9 ${showClearConfirm ? 'scale-105 ring-2 ring-destructive ring-offset-2' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
            {showClearConfirm ? 'CONFIRMAR' : 'Reset Total'}
          </Button>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Solicitações VIP Pendentes ({pendingUsers.length})
            </CardTitle>
            <CardDescription>Usuários que informaram ter realizado o pagamento via PIX.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingUsers.map((u) => (
              <div key={u.uid} className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
                <div>
                  <p className="font-bold">{u.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {u.uid}</p>
                </div>
                <Button 
                  onClick={() => onApproveVip(u.uid)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Aprovar VIP
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm" onPaste={handlePaste}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Novo Palpite Manual
            </CardTitle>
            <CardDescription>Adicione palpites manualmente ou cole uma print (CTRL+V).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isInterpreting && (
              <div className="flex items-center gap-2 text-xs text-primary animate-pulse font-bold">
                <Loader2 className="w-3 h-3 animate-spin" />
                INTERPRETANDO...
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => onShowStatus("Clique aqui e aperte CTRL+V para colar a print da sua aposta.", "info")}
            >
              <ImageIcon className="w-4 h-4" />
              Colar Print (CTRL+V)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Aposta</Label>
              <Select 
                value={newBet.type} 
                onValueChange={(v: any) => setNewBet(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Individual</SelectItem>
                  <SelectItem value="multi">Múltipla</SelectItem>
                  <SelectItem value="bingo">Bingo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                value={newBet.title} 
                onChange={e => setNewBet(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Dupla de Valor"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição Curta</Label>
            <Input 
              value={newBet.description} 
              onChange={e => setNewBet(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Jogos da Champions League"
            />
          </div>

          <div className="space-y-2">
            <Label>Análise Técnica</Label>
            <Textarea 
              value={newBet.analysis} 
              onChange={e => setNewBet(prev => ({ ...prev, analysis: e.target.value }))}
              placeholder="Justificativa para os usuários..."
              className="h-24"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isVip" 
                checked={newBet.isVip} 
                onChange={e => setNewBet(prev => ({ ...prev, isVip: e.target.checked }))}
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="isVip">Aposta VIP</Label>
            </div>
            <div className="flex-1">
              <Label>Odd Total</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={newBet.odds} 
                onChange={e => setNewBet(prev => ({ ...prev, odds: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Adicionar Jogos</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <Input 
                placeholder="Time Casa" 
                value={newMatch.homeTeam} 
                onChange={e => setNewMatch(prev => ({ ...prev, homeTeam: e.target.value }))}
              />
              <Input 
                placeholder="Time Fora" 
                value={newMatch.awayTeam} 
                onChange={e => setNewMatch(prev => ({ ...prev, awayTeam: e.target.value }))}
              />
              <Input 
                placeholder="Liga" 
                value={newMatch.league} 
                onChange={e => setNewMatch(prev => ({ ...prev, league: e.target.value }))}
              />
              <Input 
                placeholder="Palpite" 
                value={newMatch.prediction} 
                onChange={e => setNewMatch(prev => ({ ...prev, prediction: e.target.value }))}
              />
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Odd" 
                value={newMatch.odds} 
                onChange={e => setNewMatch(prev => ({ ...prev, odds: parseFloat(e.target.value) }))}
              />
              <Input 
                placeholder="Horário" 
                value={newMatch.time} 
                onChange={e => setNewMatch(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <Button variant="outline" onClick={handleAddMatch} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Adicionar Jogo à Lista
            </Button>
          </div>

          {newBet.matches && newBet.matches.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Jogos Selecionados</h4>
              {newBet.matches.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border/50">
                  <div className="text-sm">
                    <span className="font-bold">{m.homeTeam} vs {m.awayTeam}</span>
                    <span className="text-muted-foreground ml-2">({m.prediction} @ {m.odds})</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMatch(i)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button 
            onClick={handleSaveBet} 
            className="w-full bg-primary hover:bg-primary/90 h-12 font-bold gap-2"
            disabled={!newBet.title || !newBet.matches || newBet.matches.length === 0}
          >
            <Save className="w-5 h-5" /> PUBLICAR PALPITE
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
