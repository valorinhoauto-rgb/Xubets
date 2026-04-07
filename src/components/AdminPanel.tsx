import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, Save, RefreshCw, ShieldCheck, Image as ImageIcon, Loader2, Key } from 'lucide-react';
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
  onCheckResults: () => void;
  isGenerating: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onAddBet, onForceGenerate, onCheckResults, isGenerating }) => {
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

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
              alert("Print interpretada com sucesso!");
            } else {
              alert("Não foi possível interpretar esta imagem. Tente uma print mais clara.");
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao processar imagem.");
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Painel Administrativo</h2>
          <p className="text-muted-foreground">Gerencie palpites e automação de IA.</p>
        </div>
        <div className="flex gap-2">
          {!hasApiKey && (
            <Button 
              onClick={handleOpenKeyDialog}
              variant="destructive"
              className="gap-2 animate-pulse"
            >
              <Key className="w-4 h-4" />
              Configurar Chave API
            </Button>
          )}
          <Button 
            onClick={onCheckResults} 
            variant="outline"
            disabled={isGenerating}
            className="border-primary/20 text-primary hover:bg-primary/5 gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Verificar Resultados via IA
          </Button>
          <Button 
            onClick={onForceGenerate} 
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Gerando...' : 'Forçar Geração IA'}
          </Button>
        </div>
      </div>

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
              onClick={() => alert("Clique aqui e aperte CTRL+V para colar a print da sua aposta.")}
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
