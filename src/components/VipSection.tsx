import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Zap, Trophy, ShieldCheck, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload } from '../lib/pix';

interface VipSectionProps {
  onSubscribe: () => void;
  isVip: boolean;
}

const VIP_PRICE = 29.90;

export const VipSection: React.FC<VipSectionProps> = ({ onSubscribe, isVip }) => {
  const [showPixModal, setShowPixModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const pixKey = import.meta.env.VITE_PIX_KEY || "seu-pix@email.com";
  const pixName = import.meta.env.VITE_PIX_NAME || "XUBETS";
  const pixCity = import.meta.env.VITE_PIX_CITY || "BRASILIA";

  const pixPayload = generatePixPayload({
    key: pixKey,
    name: pixName,
    city: pixCity,
    amount: VIP_PRICE,
    description: "Assinatura XUBETS VIP"
  });

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-4xl font-black tracking-tight mb-4">XUBETS VIP</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Acesse as melhores odds, palpites exclusivos e análises profundas do mercado.
            Aumente sua lucratividade com a inteligência do Gemini.
          </p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: <ShieldCheck className="w-6 h-6 text-primary" />, title: "Segurança Máxima", desc: "Odds entre 1.50 e 2.00 com alta taxa de acerto." },
          { icon: <Zap className="w-6 h-6 text-blue-400" />, title: "Múltiplas VIP", desc: "Combinações estratégicas para maximizar ganhos." },
          { icon: <Trophy className="w-6 h-6 text-yellow-500" />, title: "Bingo Exclusivo", desc: "Odds 10+ com análise técnica rigorosa." }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="bg-card border-border/50">
              <CardHeader>
                <div className="mb-2">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <Crown className="w-24 h-24 text-yellow-500/10 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Plano Mensal VIP</h3>
            <div className="text-5xl font-black mb-6">
              R$ 29,90<span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="space-y-3 mb-8 text-left max-w-xs mx-auto">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Acesso a todas as odds VIP
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Notificações em tempo real
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Suporte prioritário
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Gráficos de performance avançados
              </li>
            </ul>
            <Button 
              size="lg" 
              className="w-full max-w-sm bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg h-14"
              onClick={() => setShowPixModal(true)}
              disabled={isVip}
            >
              {isVip ? 'VOCÊ JÁ É VIP!' : 'ASSINAR AGORA'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* PIX Modal */}
      <AnimatePresence>
        {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-accent/30">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Pagamento via PIX</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPixModal(false)} className="rounded-full">
                  ✕
                </Button>
              </div>
              
              <div className="p-8 space-y-6 text-center">
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                  <QRCodeSVG value={pixPayload} size={200} level="H" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Escaneie o QR Code acima ou copie o código abaixo:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-accent/50 p-3 rounded-xl text-xs font-mono truncate border border-border">
                      {pixPayload}
                    </div>
                    <Button size="icon" variant="outline" onClick={handleCopyPix} className="shrink-0 rounded-xl">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor a pagar:</span>
                    <span className="font-bold text-primary">R$ 29,90</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destinatário:</span>
                    <span className="font-bold">{pixName}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 font-bold h-12 rounded-xl gap-2"
                    onClick={() => {
                      onSubscribe();
                      setShowPixModal(false);
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5" /> JÁ REALIZEI O PAGAMENTO
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    Após o pagamento, clique no botão acima. Nossa equipe validará sua assinatura em instantes.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
