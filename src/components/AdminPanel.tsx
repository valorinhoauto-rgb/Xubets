import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, Save, RefreshCw } from 'lucide-react';
import { Bet, Match } from '../types';
import { motion } from 'framer-motion';

interface AdminPanelProps {
  onAddBet: (bet: Bet) => void;
  onForceGenerate: () => void;
  isGenerating: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onAddBet, onForceGenerate, isGenerating }) => {
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
        result: 'pending'
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
        <Button 
          onClick={onForceGenerate} 
          disabled={isGenerating}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Gerando...' : 'Forçar Geração IA'}
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Novo Palpite Manual
          </CardTitle>
          <CardDescription>Adicione palpites manualmente para os usuários.</CardDescription>
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
