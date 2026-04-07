import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Shield, Crown } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SystemConfig {
  adminEmails: string[];
  vipEmails: string[];
}

export const SettingsPanel: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({ adminEmails: [], vipEmails: [] });
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'access_control'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as SystemConfig);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddEmail = async (type: 'admin' | 'vip') => {
    if (!newEmail || !newEmail.includes('@')) return;
    
    const updatedConfig = { ...config };
    const list = type === 'admin' ? updatedConfig.adminEmails : updatedConfig.vipEmails;
    
    if (!list.includes(newEmail.toLowerCase())) {
      list.push(newEmail.toLowerCase());
      await setDoc(doc(db, 'system', 'access_control'), updatedConfig);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = async (email: string, type: 'admin' | 'vip') => {
    const updatedConfig = { ...config };
    if (type === 'admin') {
      updatedConfig.adminEmails = updatedConfig.adminEmails.filter(e => e !== email);
    } else {
      updatedConfig.vipEmails = updatedConfig.vipEmails.filter(e => e !== email);
    }
    await setDoc(doc(db, 'system', 'access_control'), updatedConfig);
  };

  if (loading) return <div className="p-8 text-center">Carregando configurações...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie permissões de acesso e usuários.</p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Novo Acesso
          </CardTitle>
          <CardDescription>Insira o e-mail do usuário para conceder permissões.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>E-mail do Usuário</Label>
              <Input 
                placeholder="exemplo@gmail.com" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={() => handleAddEmail('vip')}
                variant="outline"
                className="gap-2 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
              >
                <Crown className="w-4 h-4" /> + VIP
              </Button>
              <Button 
                onClick={() => handleAddEmail('admin')}
                className="gap-2"
              >
                <Shield className="w-4 h-4" /> + ADMIN
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Administradores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.adminEmails.map(email => (
              <div key={email} className="flex items-center justify-between p-3 bg-accent/50 rounded-xl border border-border/50">
                <span className="text-sm font-medium">{email}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveEmail(email, 'admin')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {config.adminEmails.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum administrador adicional.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" /> Usuários VIP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.vipEmails.map(email => (
              <div key={email} className="flex items-center justify-between p-3 bg-accent/50 rounded-xl border border-border/50">
                <span className="text-sm font-medium">{email}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveEmail(email, 'vip')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {config.vipEmails.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum VIP adicional.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
