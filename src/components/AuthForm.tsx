import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';

interface AuthFormProps {
  onLogin: (email: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border/50 shadow-2xl bg-card backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-black tracking-tight">XUBETS</CardTitle>
            <CardDescription>Sua vantagem inteligente no jogo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Acesse a plataforma com sua conta Google para salvar seus palpites e progresso.
              </p>
            </div>
            
            <Button 
              onClick={() => onLogin('')} 
              className="w-full font-bold h-14 bg-white text-black hover:bg-white/90 gap-3 text-lg shadow-xl shadow-white/5"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              ENTRAR COM GOOGLE
            </Button>

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
              Seguro & Criptografado
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
